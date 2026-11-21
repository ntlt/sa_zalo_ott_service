param(
    [string]$Region = "ap-southeast-1",
    [string]$KeyName = "sa-zalo-ott-key",
    [string]$KeyFile = "",
    [string]$SecurityGroupName = "sa-zalo-ott-sg",
    [string]$InstanceName = "sa-zalo-ott-server"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ProvidedKeyFile = $KeyFile.Trim() -ne ""
if (-not $ProvidedKeyFile) {
    $KeyFile = Join-Path $RepoRoot "$KeyName.pem"
}

$AwsFound = Get-Command aws -ErrorAction SilentlyContinue
$AwsCmd = if ($AwsFound) { $AwsFound.Source } else { $null }
if (-not $AwsCmd -and (Test-Path "C:\Program Files\Amazon\AWSCLIV2\aws.exe")) {
    $AwsCmd = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
}
if (-not $AwsCmd) {
    throw "AWS CLI v2 not found. Run: winget install -e --id Amazon.AWSCLI"
}

Write-Host "==> Checking AWS credentials in region '$Region'..." -ForegroundColor Cyan
$IdentityJson = & $AwsCmd sts get-caller-identity --region $Region --output json
if ($LASTEXITCODE -ne 0) {
    throw "AWS credentials are not configured or invalid. Run 'aws configure' first."
}
$Identity = ($IdentityJson -join "`n") | ConvertFrom-Json
Write-Host "    Authenticated as AWS Account: $($Identity.Account) ($($Identity.Arn))" -ForegroundColor Green

# 1. Select Free-Tier eligible instance type in region
Write-Host "==> Detecting Free-Tier eligible EC2 instance type in $Region..." -ForegroundColor Cyan
$PrevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$FreeTypesText = (& $AwsCmd ec2 describe-instance-types `
    --region $Region `
    --filters "Name=free-tier-eligible,Values=true" "Name=processor-info.supported-architecture,Values=x86_64" `
    --query "InstanceTypes[].InstanceType" `
    --output text 2>$null)
$FreeTypesExit = $LASTEXITCODE
$ErrorActionPreference = $PrevEap
$FreeTypes = if ($FreeTypesExit -eq 0) { @($FreeTypesText -split "\s+" | Where-Object { $_ }) } else { @() }
if ($FreeTypesExit -ne 0) {
    Write-Host "    Cannot query Free-Tier types (possibly blocked by organization policy); using t3.micro." -ForegroundColor Yellow
}
$InstanceType = if ($FreeTypes -contains "t3.small") {
    "t3.small"
} elseif ($FreeTypes -contains "t3.micro") {
    "t3.micro"
} elseif ($FreeTypes -contains "t2.micro") {
    "t2.micro"
} elseif ($FreeTypes.Count -gt 0) {
    [string]$FreeTypes[0]
} else {
    "t3.micro"
}
Write-Host "    Selected Instance Type: $InstanceType" -ForegroundColor Green

# 2. Resolve latest official Ubuntu 24.04 LTS AMI
Write-Host "==> Resolving latest Ubuntu 24.04 LTS AMI..." -ForegroundColor Cyan
$PrevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$SsmOutput = @(& $AwsCmd ssm get-parameter `
    --region $Region `
    --name "/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id" `
    --query "Parameter.Value" `
    --output text 2>$null)
$SsmExit = $LASTEXITCODE
$ErrorActionPreference = $PrevEap
$AmiId = if ($SsmExit -eq 0) { ([string]($SsmOutput -join "`n")).Trim() } else { "" }

if (-not $AmiId -or $AmiId -notmatch "^ami-") {
    Write-Host "    SSM public parameter is blocked; resolving AMI through EC2 DescribeImages..." -ForegroundColor Yellow
    $PrevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $ImageLookup = (& $AwsCmd ec2 describe-images `
        --region $Region `
        --owners "099720165015" `
        --filters `
            "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" `
            "Name=state,Values=available" `
            "Name=architecture,Values=x86_64" `
            "Name=root-device-type,Values=ebs" `
            "Name=virtualization-type,Values=hvm" `
        --query "sort_by(Images,&CreationDate)[-1].ImageId" `
        --output text 2>$null)
    $ImageLookupExit = $LASTEXITCODE
    $ErrorActionPreference = $PrevEap
    $AmiId = if ($ImageLookupExit -eq 0) { ([string]$ImageLookup).Trim() } else { "" }
}

if (-not $AmiId -or $AmiId -notmatch "^ami-") {
    throw "Could not resolve the Ubuntu 24.04 AMI in $Region. This account needs ec2:DescribeImages allowed by its AWS Organizations SCP, or use an EC2 instance that has already been launched."
}
$RootDevice = (& $AwsCmd ec2 describe-images `
    --region $Region `
    --image-ids $AmiId `
    --query "Images[0].RootDeviceName" `
    --output text).Trim()
if (-not $RootDevice -or $RootDevice -eq "None") {
    $RootDevice = "/dev/sda1"
}
Write-Host "    Ubuntu 24.04 AMI: $AmiId (RootDevice: $RootDevice)" -ForegroundColor Green

# 3. Ensure Default VPC & Security Group
Write-Host "==> Ensuring Security Group '$SecurityGroupName'..." -ForegroundColor Cyan
$VpcId = (& $AwsCmd ec2 describe-vpcs --region $Region --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text).Trim()
if (-not $VpcId -or $VpcId -eq "None") {
    $VpcId = (& $AwsCmd ec2 create-default-vpc --region $Region --query "Vpc.VpcId" --output text).Trim()
}

$SgId = (& $AwsCmd ec2 describe-security-groups `
    --region $Region `
    --filters "Name=group-name,Values=$SecurityGroupName" "Name=vpc-id,Values=$VpcId" `
    --query "SecurityGroups[0].GroupId" `
    --output text).Trim()

if (-not $SgId -or $SgId -eq "None") {
    $SgId = (& $AwsCmd ec2 create-security-group `
        --region $Region `
        --group-name $SecurityGroupName `
        --description "Security group for sa_zalo_ott_service (SSH 22, HTTP 80, Web 3000, Mobile 3001)" `
        --vpc-id $VpcId `
        --query "GroupId" `
        --output text).Trim()
}

$PrevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
foreach ($Port in @(22, 80, 3000, 3001)) {
    & $AwsCmd ec2 authorize-security-group-ingress `
        --region $Region `
        --group-id $SgId `
        --protocol tcp `
        --port $Port `
        --cidr "0.0.0.0/0" >$null 2>&1
}
$ErrorActionPreference = $PrevEap
Write-Host "    Security Group ready: $SgId (TCP 22, 80, 3000, 3001 open)" -ForegroundColor Green

# 4. Ensure EC2 Key Pair
Write-Host "==> Ensuring EC2 Key Pair '$KeyName'..." -ForegroundColor Cyan
$ErrorActionPreference = "Continue"
$ExistingKey = (& $AwsCmd ec2 describe-key-pairs --region $Region --key-names $KeyName --query "KeyPairs[0].KeyName" --output text 2>$null)
$KeyCheckExit = $LASTEXITCODE
$ErrorActionPreference = $PrevEap

if ($ProvidedKeyFile) {
    if ($KeyCheckExit -ne 0 -or -not $ExistingKey -or $ExistingKey.Trim() -eq "None") {
        throw "The EC2 Key Pair '$KeyName' was not found in $Region. Create it in that region or use -KeyName with a matching existing pair."
    }
    if (-not (Test-Path $KeyFile)) {
        throw "The private key file '$KeyFile' was not found."
    }
    Write-Host "    Reusing existing EC2 Key Pair '$KeyName' and PEM file: $KeyFile" -ForegroundColor Green
} elseif ($KeyCheckExit -ne 0 -or -not $ExistingKey -or -not (Test-Path $KeyFile)) {
    if ($KeyCheckExit -eq 0 -and $ExistingKey) {
        & $AwsCmd ec2 delete-key-pair --region $Region --key-name $KeyName | Out-Null
    }
    $KeyMaterial = (& $AwsCmd ec2 create-key-pair `
        --region $Region `
        --key-name $KeyName `
        --query "KeyMaterial" `
        --output text) -join "`n"
    [System.IO.File]::WriteAllText($KeyFile, ($KeyMaterial + "`n"), (New-Object System.Text.UTF8Encoding($false)))
    icacls $KeyFile /inheritance:r | Out-Null
    icacls $KeyFile /grant:r "$($env:USERNAME):(R)" | Out-Null
    Write-Host "    Created SSH key file: $KeyFile" -ForegroundColor Green
} else {
    Write-Host "    Reusing existing SSH key file: $KeyFile" -ForegroundColor Green
}

# 5. Check for existing running/pending instance or launch a new one
Write-Host "==> Checking for existing EC2 instance '$InstanceName'..." -ForegroundColor Cyan
$ExistingInstanceId = ([string](& $AwsCmd ec2 describe-instances `
    --region $Region `
    --filters "Name=tag:Name,Values=$InstanceName" "Name=instance-state-name,Values=pending,running,stopped" `
    --query "Reservations[0].Instances[0].InstanceId" `
    --output text)).Trim()

if (-not $ExistingInstanceId -or $ExistingInstanceId -eq "None") {
    Write-Host "==> Launching new EC2 instance ($InstanceType, 20GB gp3)..." -ForegroundColor Cyan
    $BlockMapping = "DeviceName=$RootDevice,Ebs={VolumeSize=20,VolumeType=gp3,DeleteOnTermination=true}"
    $TagSpec = "ResourceType=instance,Tags=[{Key=Name,Value=$InstanceName}]"
    $InstanceId = ([string](& $AwsCmd ec2 run-instances `
        --region $Region `
        --image-id $AmiId `
        --instance-type $InstanceType `
        --key-name $KeyName `
        --security-group-ids $SgId `
        --block-device-mappings $BlockMapping `
        --tag-specifications $TagSpec `
        --query "Instances[0].InstanceId" `
        --output text)).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $InstanceId -or $InstanceId -eq "None") {
        throw "Failed to launch EC2 instance."
    }
} else {
    $InstanceId = $ExistingInstanceId
    $State = ([string](& $AwsCmd ec2 describe-instances --region $Region --instance-ids $InstanceId --query "Reservations[0].Instances[0].State.Name" --output text)).Trim()
    if ($State -eq "stopped") {
        & $AwsCmd ec2 start-instances --region $Region --instance-ids $InstanceId | Out-Null
    }
}

Write-Host "    Waiting for EC2 instance $InstanceId to enter 'running' state..." -ForegroundColor Cyan
& $AwsCmd ec2 wait instance-running --region $Region --instance-ids $InstanceId

$PublicIp = ([string](& $AwsCmd ec2 describe-instances `
    --region $Region `
    --instance-ids $InstanceId `
    --query "Reservations[0].Instances[0].PublicIpAddress" `
    --output text)).Trim()

Write-Host "    EC2 Instance Running! ID=$InstanceId, PublicIP=$PublicIp" -ForegroundColor Green

# 6. Deploy Docker stack over SSH
& (Join-Path $PSScriptRoot "deploy-to-ec2.ps1") -HostIp $PublicIp -KeyPath $KeyFile -SshUser "ubuntu"
