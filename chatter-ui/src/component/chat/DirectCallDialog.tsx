import React, { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Typography,
} from "@mui/material";
import CallEndRoundedIcon from "@mui/icons-material/CallEndRounded";
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import MicOffRoundedIcon from "@mui/icons-material/MicOffRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import VideocamOffRoundedIcon from "@mui/icons-material/VideocamOffRounded";
import {
  CallIceServer,
  CallRealtimeClient,
  CallSignal,
  DirectCallMode,
  IncomingCall,
  OutgoingCall,
} from "../../services/calls";

export type DirectCallDialogState =
  | { role: "incoming"; call: IncomingCall; status: "ringing" | "active" }
  | { role: "outgoing"; call: OutgoingCall; status: "ringing" | "active" };

interface Props {
  open: boolean;
  state: DirectCallDialogState | null;
  peerName: string;
  peerAvatar?: string;
  callClient: CallRealtimeClient | null;
  iceServers: CallIceServer[];
  onAccepted: (callId: string) => void;
  onEnded: (message?: string) => void;
  onSignal: (callId: string, signal: CallSignal) => void;
  signal: CallSignal | null;
  signalSeq: number;
}

const DirectCallDialog: React.FC<Props> = ({
  open,
  state,
  peerName,
  peerAvatar,
  callClient,
  iceServers,
  onAccepted,
  onEnded,
  onSignal,
  signal,
  signalSeq,
}) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const onSignalRef = useRef(onSignal);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [error, setError] = useState("");

  const callId = state?.call.callId;
  const callRole = state?.role;
  const callStatus = state?.status;
  const mode: DirectCallMode = state?.call.mode ?? "video";

  useEffect(() => {
    onSignalRef.current = onSignal;
  }, [onSignal]);

  useEffect(() => {
    if (!open || !callId) return;

    let disposed = false;
    const setup = async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError("Cuộc gọi cần HTTPS để sử dụng microphone và camera.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === "video",
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const rtc = new RTCPeerConnection({
          iceServers: iceServers.length
            ? iceServers
            : [{ urls: "stun:stun.l.google.com:19302" }],
        });
        peerConnectionRef.current = rtc;
        stream.getTracks().forEach((track) => rtc.addTrack(track, stream));
        rtc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };
        rtc.onicecandidate = (event) => {
          if (event.candidate) {
            onSignalRef.current(callId, {
              type: "candidate",
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
            });
          }
        };
      } catch (mediaError) {
        setError(
          mediaError instanceof Error
            ? mediaError.message
            : "Không thể truy cập microphone/camera.",
        );
      }
    };

    void setup();
    return () => {
      disposed = true;
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  }, [open, callId, mode, iceServers]);

  useEffect(() => {
    if (!signal || !peerConnectionRef.current || !callId) return;
    const rtc = peerConnectionRef.current;
    const applySignal = async () => {
      try {
        if (signal.type === "offer" && signal.sdp) {
          await rtc.setRemoteDescription({ type: "offer", sdp: signal.sdp });
          const answer = await rtc.createAnswer();
          await rtc.setLocalDescription(answer);
          onSignalRef.current(callId, {
            type: "answer",
            sdp: answer.sdp,
          });
        } else if (signal.type === "answer" && signal.sdp) {
          await rtc.setRemoteDescription({ type: "answer", sdp: signal.sdp });
        } else if (signal.type === "candidate" && signal.candidate) {
          await rtc.addIceCandidate({
            candidate: signal.candidate,
            sdpMid: signal.sdpMid,
            sdpMLineIndex: signal.sdpMLineIndex ?? undefined,
          });
        }
      } catch (signalError) {
        setError(
          signalError instanceof Error
            ? signalError.message
            : "Không thể thiết lập kết nối cuộc gọi.",
        );
      }
    };
    void applySignal();
  }, [signal, signalSeq, callId]);

  useEffect(() => {
    if (!open || callStatus !== "active" || callRole !== "outgoing" || !callId) {
      return;
    }
    const rtc = peerConnectionRef.current;
    if (!rtc) return;
    const createOffer = async () => {
      try {
        const offer = await rtc.createOffer();
        await rtc.setLocalDescription(offer);
        onSignalRef.current(callId, { type: "offer", sdp: offer.sdp });
      } catch (offerError) {
        setError(
          offerError instanceof Error
            ? offerError.message
            : "Không thể bắt đầu kết nối cuộc gọi.",
        );
      }
    };
    void createOffer();
  }, [open, callStatus, callRole, callId]);

  const toggleMic = () => {
    const next = !micMuted;
    localStreamRef.current
      ?.getAudioTracks()
      .forEach((track) => (track.enabled = !next));
    setMicMuted(next);
  };

  const toggleCamera = () => {
    const next = !cameraOff;
    localStreamRef.current
      ?.getVideoTracks()
      .forEach((track) => (track.enabled = !next));
    setCameraOff(next);
  };

  const accept = async () => {
    if (!state || state.role !== "incoming" || !callClient) return;
    const result = await callClient.accept(state.call.callId);
    if (result.ok) onAccepted(state.call.callId);
    else onEnded(result.message);
  };

  const rejectOrEnd = async () => {
    if (!state || !callClient) return;
    if (state.role === "incoming" && state.status === "ringing") {
      await callClient.reject(state.call.callId);
    } else if (state.role === "outgoing" && state.status === "ringing") {
      await callClient.cancel(state.call.callId);
    } else {
      await callClient.end(state.call.callId);
    }
    onEnded();
  };

  return (
    <Dialog open={open} onClose={() => undefined} fullWidth maxWidth="md">
      <DialogContent sx={{ bgcolor: "#101827", color: "#fff", p: 0, minHeight: 420 }}>
        <Box sx={{ position: "relative", height: 420 }}>
          {mode === "video" ? (
            <Box
              component="video"
              ref={remoteVideoRef}
              autoPlay
              playsInline
              sx={{ width: "100%", height: "100%", objectFit: "cover", bgcolor: "#202a36" }}
            />
          ) : (
            <Box sx={{ height: "100%", display: "grid", placeItems: "center" }}>
              <Avatar src={peerAvatar} sx={{ width: 112, height: 112, fontSize: 38 }}>
                {peerName.slice(0, 2).toUpperCase()}
              </Avatar>
            </Box>
          )}
          {mode === "video" && (
            <Box
              component="video"
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              sx={{
                position: "absolute",
                right: 16,
                bottom: 16,
                width: 180,
                height: 120,
                objectFit: "cover",
                borderRadius: 2,
                border: "2px solid #fff",
                bgcolor: "#202a36",
              }}
            />
          )}
          <Box sx={{ position: "absolute", left: 16, top: 16 }}>
            <Typography sx={{ fontWeight: 700 }}>{peerName}</Typography>
            <Typography sx={{ fontSize: 13, opacity: 0.85 }}>
              {state?.status === "ringing" ? "Đang đổ chuông..." : "Cuộc gọi đang kết nối"}
            </Typography>
          </Box>
          {error && (
            <Typography sx={{ position: "absolute", left: 16, bottom: 16, color: "#ffb4b4", maxWidth: 360 }}>
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", py: 1.5, bgcolor: "#101827" }}>
        {state?.role === "incoming" && state.status === "ringing" ? (
          <>
            <Button variant="contained" color="success" onClick={() => void accept()}>
              Chấp nhận
            </Button>
            <Button variant="contained" color="error" onClick={() => void rejectOrEnd()}>
              Từ chối
            </Button>
          </>
        ) : (
          <>
            <IconButton aria-label="Tắt hoặc bật micro" onClick={toggleMic} sx={{ color: "#fff", bgcolor: "rgba(255,255,255,.12)" }}>
              {micMuted ? <MicOffRoundedIcon /> : <MicRoundedIcon />}
            </IconButton>
            {mode === "video" && (
              <IconButton aria-label="Tắt hoặc bật camera" onClick={toggleCamera} sx={{ color: "#fff", bgcolor: "rgba(255,255,255,.12)" }}>
                {cameraOff ? <VideocamOffRoundedIcon /> : <VideocamRoundedIcon />}
              </IconButton>
            )}
            <IconButton aria-label="Kết thúc cuộc gọi" onClick={() => void rejectOrEnd()} sx={{ color: "#fff", bgcolor: "#d93025" }}>
              <CallEndRoundedIcon />
            </IconButton>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DirectCallDialog;
