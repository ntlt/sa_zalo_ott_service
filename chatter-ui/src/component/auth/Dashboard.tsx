import React, { useEffect, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputBase,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SentimentSatisfiedAltRoundedIcon from "@mui/icons-material/SentimentSatisfiedAltRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";

interface ChatMessage {
  id: number;
  text: string;
  time: string;
  isMine: boolean;
}

interface Conversation {
  id: number;
  name: string;
  initials: string;
  color: string;
  preview: string;
  time: string;
  unread: number;
  online: boolean;
  group: boolean;
  messages: ChatMessage[];
}

const initialConversations: Conversation[] = [
  {
    id: 1,
    name: "KTPM_261",
    initials: "KT",
    color: "#7c66d8",
    preview: "Khải: mình push code r nha",
    time: "09:42",
    unread: 2,
    online: true,
    group: true,
    messages: [
      { id: 1, text: "Hello mọi người đây là bản phân công cho mỗi người nhe", time: "09:30", isMine: false },
      { id: 2, text: "Oke để mình làm thêm phần báo cáo", time: "09:34", isMine: true },
      { id: 3, text: "mình push code r nha", time: "09:42", isMine: false },
    ],
  },
  {
    id: 2,
    name: "Khải Nguyễn",
    initials: "KN",
    color: "#e49b65",
    preview: "Tối nay mình gửi bạn lại tài liệu nha",
    time: "09:18",
    unread: 1,
    online: true,
    group: false,
    messages: [
      { id: 1, text: "Bạn xem giúp mình phần tài liệu với nhé.", time: "09:12", isMine: false },
      { id: 2, text: "Được nha, mình đang xem đây.", time: "09:14", isMine: true },
      { id: 3, text: "Tối nay mình gửi bạn lại tài liệu nha", time: "09:18", isMine: false },
    ],
  },
  {
    id: 3,
    name: "Lan Phạm",
    initials: "LP",
    color: "#e97891",
    preview: "Bạn: Mai qua chở ké tui được không",
    time: "Hôm qua",
    unread: 0,
    online: false,
    group: false,
    messages: [
      { id: 1, text: "Mai đi chơi hong", time: "16:20", isMine: false },
      { id: 2, text: "Mai qua chở ké tui được không", time: "16:25", isMine: true },
    ],
  },
  {
    id: 4,
    name: "Team IOT",
    initials: "TI",
    color: "#4b9b84",
    preview: "Hoàng: Đã nhận được, cảm ơn cả nhà",
    time: "T2",
    unread: 0,
    online: false,
    group: true,
    messages: [
      { id: 1, text: "Mọi người nhớ cập nhật tiến độ trước thứ Sáu nhé.", time: "14:10", isMine: false },
      { id: 2, text: "Đã nhận được, cảm ơn cả nhà", time: "14:16", isMine: false },
    ],
  },
  {
    id: 5,
    name: "Huy Trần",
    initials: "HT",
    color: "#5886c6",
    preview: "Đã gửi một ảnh",
    time: "T3",
    unread: 0,
    online: false,
    group: false,
    messages: [
      { id: 1, text: "Đã gửi một ảnh", time: "11:05", isMine: false },
    ],
  },
  {
    id: 6,
    name: "Cộng đồng học tập",
    initials: "CH",
    color: "#ce8e4d",
    preview: "Thu: Tài liệu mình để trong nhóm rồi nha",
    time: "T3",
    unread: 0,
    online: false,
    group: true,
    messages: [
      { id: 1, text: "Tài liệu mình để trong nhóm rồi nha", time: "10:44", isMine: false },
    ],
  },
];

const CONVERSATIONS_STORAGE_KEY = "chatter.conversations";

const isChatMessage = (value: unknown): value is ChatMessage => {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return (
    typeof message.id === "number" &&
    typeof message.text === "string" &&
    typeof message.time === "string" &&
    typeof message.isMine === "boolean"
  );
};

const isConversation = (value: unknown): value is Conversation => {
  if (typeof value !== "object" || value === null) return false;
  const conversation = value as Record<string, unknown>;
  return (
    typeof conversation.id === "number" &&
    typeof conversation.name === "string" &&
    typeof conversation.initials === "string" &&
    typeof conversation.color === "string" &&
    typeof conversation.preview === "string" &&
    typeof conversation.time === "string" &&
    typeof conversation.unread === "number" &&
    typeof conversation.online === "boolean" &&
    typeof conversation.group === "boolean" &&
    Array.isArray(conversation.messages) &&
    conversation.messages.every(isChatMessage)
  );
};

const loadConversations = (): Conversation[] => {
  if (process.env.NODE_ENV === "development") return initialConversations;

  try {
    const stored = window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (stored === null) return initialConversations;

    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.every(isConversation)) return parsed;

    console.error("Saved conversations have an invalid format.");
  } catch (error) {
    console.error("Failed to load saved conversations:", error);
  }

  return initialConversations;
};

type Section = "messages" | "contacts" | "groups";

const Dashboard = () => {
  const isMobile = useMediaQuery("(max-width:760px)");
  const [conversations, setConversations] = useState(loadConversations);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "groups">("all");
  const [draft, setDraft] = useState("");
  const [activeSection, setActiveSection] = useState<Section>("messages");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newConversationName, setNewConversationName] = useState("");

  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;

    try {
      window.localStorage.setItem(
        CONVERSATIONS_STORAGE_KEY,
        JSON.stringify(conversations),
      );
    } catch (error) {
      console.error("Failed to save conversations:", error);
    }
  }, [conversations]);

  const navItems = [
    { id: "messages" as const, label: "Tin nhắn", icon: <ChatRoundedIcon /> },
    { id: "contacts" as const, label: "Danh bạ", icon: <PeopleAltRoundedIcon /> },
    { id: "groups" as const, label: "Nhóm", icon: <GroupsRoundedIcon /> },
  ];

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedId) ??
    (activeSection === "messages" ? conversations[0] : null);
  const visibleConversations = conversations.filter((conversation) => {
    const searchText = search.toLocaleLowerCase("vi");
    const matchesSearch =
      conversation.name.toLocaleLowerCase("vi").includes(searchText) ||
      conversation.preview.toLocaleLowerCase("vi").includes(searchText);
    const matchesSection =
      activeSection === "messages" ||
      (activeSection === "contacts" && !conversation.group) ||
      (activeSection === "groups" && conversation.group);
    const matchesFilter =
      activeSection !== "messages" ||
      filter === "all" ||
      (filter === "unread" && conversation.unread > 0) ||
      (filter === "groups" && conversation.group);
    return matchesSearch && matchesSection && matchesFilter;
  });
  const showConversationList = !isMobile || selectedId === null;
  const sectionTitle =
    activeSection === "contacts"
      ? "Danh bạ"
      : activeSection === "groups"
        ? "Nhóm"
        : "Tin nhắn";

  const selectConversation = (conversation: Conversation) => {
    setSelectedId(conversation.id);
    setConversations((current) =>
      current.map((item) =>
        item.id === conversation.id ? { ...item, unread: 0 } : item,
      ),
    );
  };

  const startConversation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newConversationName.trim();
    if (!name) return;

    const conversation: Conversation = {
      id: Date.now(),
      name,
      initials: name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toLocaleUpperCase("vi"),
      color: "#5886c6",
      preview: "Bắt đầu cuộc trò chuyện",
      time: "Vừa xong",
      unread: 0,
      online: false,
      group: false,
      messages: [],
    };

    setConversations((current) => [conversation, ...current]);
    setActiveSection("messages");
    setFilter("all");
    setSearch("");
    setSelectedId(conversation.id);
    setNewConversationName("");
    setCreateDialogOpen(false);
  };

  const sendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !selectedConversation) return;

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selectedConversation.id
          ? {
              ...conversation,
              preview: `Bạn: ${text}`,
              time: "Vừa xong",
              messages: [
                ...conversation.messages,
                {
                  id: Date.now(),
                  text,
                  time: new Date().toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  isMine: true,
                },
              ],
            }
          : conversation,
      ),
    );
    setDraft("");
  };

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        height: "100dvh",
        minHeight: 560,
        overflow: "hidden",
        bgcolor: "#f4f6f9",
        color: "#202a36",
        fontFamily: '"Roboto", "Arial", sans-serif',
      }}
    >
      <Box
        component="nav"
        aria-label="Điều hướng chính"
        sx={{
          width: isMobile ? 56 : 68,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 2,
          gap: 1.5,
          bgcolor: "#0866ff",
          color: "white",
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            mb: 2,
            display: "grid",
            placeItems: "center",
            borderRadius: 2.5,
            bgcolor: "rgba(255,255,255,.18)",
          }}
        >
          <ChatRoundedIcon />
        </Box>
        {navItems.map((item) => (
          <Tooltip key={item.label} title={item.label} placement="right">
            <IconButton
              aria-label={item.label}
              aria-pressed={activeSection === item.id}
              onClick={() => {
                setActiveSection(item.id);
                setSelectedId(null);
                setFilter("all");
              }}
              sx={{
                width: 44,
                height: 44,
                color: "white",
                borderRadius: 2.5,
                bgcolor:
                  activeSection === item.id
                    ? "rgba(255,255,255,.2)"
                    : "transparent",
                "&:hover": { bgcolor: "rgba(255,255,255,.16)" },
              }}
            >
              {item.icon}
            </IconButton>
          </Tooltip>
        ))}
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Cài đặt" placement="right">
          <IconButton aria-label="Cài đặt" sx={{ color: "white" }}>
            <SettingsRoundedIcon />
          </IconButton>
        </Tooltip>
        <Avatar sx={{ width: 36, height: 36, mb: 1, bgcolor: "#f1b878", fontSize: 14 }}>
          AN
        </Avatar>
      </Box>

      <Box
        sx={{
          width: isMobile ? "calc(100% - 56px)" : { sm: 320, md: 348 },
          flexShrink: 0,
          display: showConversationList ? "flex" : "none",
          flexDirection: "column",
          bgcolor: "#fff",
          borderRight: "1px solid #e8edf3",
        }}
      >
        <Box sx={{ px: 2.25, pt: 2.5, pb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Box>
              <Typography sx={{ fontSize: 21, fontWeight: 700, letterSpacing: "-.4px" }}>
                {sectionTitle}
              </Typography>
              <Typography sx={{ color: "#8a96a5", fontSize: 12.5, mt: 0.25 }}>
                {activeSection === "contacts"
                  ? "Mọi người bạn đã trò chuyện"
                  : activeSection === "groups"
                    ? "Các nhóm của bạn"
                    : "Kết nối với mọi người"}
              </Typography>
            </Box>
            <Tooltip title="Tạo cuộc trò chuyện mới">
              <IconButton
                aria-label="Tạo cuộc trò chuyện mới"
                onClick={() => setCreateDialogOpen(true)}
                sx={{
                  bgcolor: "#edf4ff",
                  color: "#0866ff",
                  "&:hover": { bgcolor: "#deebff" },
                }}
              >
                <AddRoundedIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              px: 1.3,
              height: 42,
              borderRadius: 2.5,
              bgcolor: "#f3f5f8",
              color: "#8591a0",
              "&:focus-within": { outline: "2px solid #b9d3ff" },
            }}
          >
            <SearchRoundedIcon sx={{ fontSize: 20, mr: 1 }} />
            <InputBase
              fullWidth
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm kiếm cuộc trò chuyện"
              inputProps={{ "aria-label": "Tìm kiếm cuộc trò chuyện" }}
              sx={{ fontSize: 13.5, color: "#263445" }}
            />
          </Box>
          {activeSection === "messages" && (
            <Box sx={{ display: "flex", gap: 0.75, mt: 1.75 }}>
              {([
                ["all", "Tất cả"],
                ["unread", "Chưa đọc"],
                ["groups", "Nhóm"],
              ] as const).map(([key, label]) => (
              <Box
                key={key}
                component="button"
                type="button"
                onClick={() => setFilter(key)}
                sx={{
                  px: 1.25,
                  py: 0.65,
                  border: 0,
                  borderRadius: 5,
                  cursor: "pointer",
                  font: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                  color: filter === key ? "#075fe5" : "#7b8795",
                  bgcolor: filter === key ? "#eaf2ff" : "transparent",
                  "&:hover": { bgcolor: filter === key ? "#eaf2ff" : "#f4f6f9" },
                }}
              >
                {label}
              </Box>
              ))}
            </Box>
          )}
        </Box>

        <Divider sx={{ borderColor: "#f0f2f5" }} />
        <Box sx={{ flex: 1, overflowY: "auto", px: 1, py: 0.75 }}>
          {visibleConversations.length ? (
            visibleConversations.map((conversation) => (
              <Box
                key={conversation.id}
                component="button"
                type="button"
                onClick={() => selectConversation(conversation)}
                aria-label={`Mở cuộc trò chuyện ${conversation.name}`}
                sx={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  gap: 1.5,
                  px: 1.25,
                  py: 1.35,
                  border: 0,
                  borderRadius: 2.5,
                  textAlign: "left",
                  cursor: "pointer",
                  bgcolor: selectedConversation?.id === conversation.id ? "#eef5ff" : "transparent",
                  "&:hover": { bgcolor: selectedConversation?.id === conversation.id ? "#eef5ff" : "#f7f8fa" },
                }}
              >
                <Badge
                  overlap="circular"
                  variant="dot"
                  invisible={!conversation.online}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  sx={{ "& .MuiBadge-badge": { bgcolor: "#31be76", boxShadow: "0 0 0 2px white" } }}
                >
                  <Avatar sx={{ width: 48, height: 48, bgcolor: conversation.color, fontSize: 14, fontWeight: 600 }}>
                    {conversation.initials}
                  </Avatar>
                </Badge>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Typography noWrap sx={{ color: "#263445", fontSize: 13.5, fontWeight: conversation.unread ? 700 : 600 }}>
                      {conversation.name}
                    </Typography>
                    <Typography sx={{ color: "#9aa4b1", whiteSpace: "nowrap", fontSize: 10.5 }}>
                      {conversation.time}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mt: 0.55 }}>
                    <Typography noWrap sx={{ color: conversation.unread ? "#516071" : "#929dab", fontSize: 12 }}>
                      {conversation.preview}
                    </Typography>
                    {conversation.unread > 0 && (
                      <Box sx={{ minWidth: 18, height: 18, px: 0.5, display: "grid", placeItems: "center", borderRadius: 5, bgcolor: "#0866ff", color: "white", fontSize: 10, fontWeight: 700 }}>
                        {conversation.unread}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            ))
          ) : (
            <Typography sx={{ px: 2, py: 4, textAlign: "center", color: "#8995a3", fontSize: 13 }}>
              Không tìm thấy cuộc trò chuyện
            </Typography>
          )}
        </Box>
        <Box sx={{ px: 2, py: 1.5, borderTop: "1px solid #f0f2f5" }}>
          <Typography sx={{ color: "#9aa4b1", fontSize: 11, textAlign: "center" }}>
            Chatter · Luôn giữ kết nối
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          minWidth: 0,
          flex: 1,
          display: !isMobile || selectedId !== null ? "flex" : "none",
          flexDirection: "column",
          bgcolor: "#f7f9fc",
        }}
      >
        {selectedConversation ? (
          <>
            <Box
              sx={{
                height: 72,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                px: { xs: 1.5, sm: 2.5 },
                gap: 1.5,
                bgcolor: "#fff",
                borderBottom: "1px solid #e9edf2",
              }}
            >
              {isMobile && (
                <IconButton aria-label="Quay lại danh sách" onClick={() => setSelectedId(null)}>
                  <ArrowBackRoundedIcon />
                </IconButton>
              )}
              <Avatar sx={{ width: 42, height: 42, bgcolor: selectedConversation.color, fontSize: 13, fontWeight: 600 }}>
                {selectedConversation.initials}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography noWrap sx={{ color: "#263445", fontSize: 14.5, fontWeight: 700 }}>
                  {selectedConversation.name}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mt: 0.25 }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: selectedConversation.online ? "#31be76" : "#b4bdc8" }} />
                  <Typography sx={{ color: "#8b97a5", fontSize: 11.5 }}>
                    {selectedConversation.group ? "Cuộc trò chuyện nhóm" : selectedConversation.online ? "Đang hoạt động" : "Ngoại tuyến"}
                  </Typography>
                </Box>
              </Box>
              <Tooltip title="Gọi thoại">
                <IconButton aria-label="Gọi thoại" sx={{ color: "#647386" }}>
                  <PhoneRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Gọi video">
                <IconButton aria-label="Gọi video" sx={{ color: "#647386", display: { xs: "none", sm: "inline-flex" } }}>
                  <VideocamRoundedIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Thông tin cuộc trò chuyện">
                <IconButton aria-label="Thông tin cuộc trò chuyện" sx={{ color: "#647386" }}>
                  <InfoOutlinedIcon />
                </IconButton>
              </Tooltip>
              <IconButton aria-label="Tùy chọn" sx={{ color: "#647386", display: { xs: "none", sm: "inline-flex" } }}>
                <MoreHorizRoundedIcon />
              </IconButton>
            </Box>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                px: { xs: 1.5, sm: 4, md: 7 },
                py: 3,
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
                <Typography sx={{ px: 1.5, py: 0.6, borderRadius: 5, bgcolor: "#edf0f4", color: "#929dab", fontSize: 10.5 }}>
                  HÔM NAY
                </Typography>
              </Box>
              {selectedConversation.messages.length === 0 && (
                <Box sx={{ flex: 1, display: "grid", placeItems: "center", color: "#8c98a7", textAlign: "center" }}>
                  <Box>
                    <ChatRoundedIcon sx={{ fontSize: 38, color: "#b7c8df", mb: 1 }} />
                    <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Bắt đầu cuộc trò chuyện</Typography>
                    <Typography sx={{ fontSize: 12.5, mt: 0.5 }}>Gửi lời chào đầu tiên đến {selectedConversation.name}.</Typography>
                  </Box>
                </Box>
              )}
              {selectedConversation.messages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    display: "flex",
                    justifyContent: message.isMine ? "flex-end" : "flex-start",
                    alignItems: "flex-end",
                    gap: 1,
                  }}
                >
                  {!message.isMine && (
                    <Avatar sx={{ width: 28, height: 28, mb: 0.25, bgcolor: selectedConversation.color, fontSize: 9.5 }}>
                      {selectedConversation.initials}
                    </Avatar>
                  )}
                  <Box
                    sx={{
                      maxWidth: { xs: "82%", sm: "70%" },
                      px: 1.8,
                      py: 1.15,
                      borderRadius: message.isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      bgcolor: message.isMine ? "#0866ff" : "#fff",
                      color: message.isMine ? "#fff" : "#354254",
                      boxShadow: "0 1px 2px rgba(34,48,68,.06)",
                    }}
                  >
                    <Typography sx={{ fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                      {message.text}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.4, mt: 0.45 }}>
                      <Typography sx={{ fontSize: 10, color: message.isMine ? "rgba(255,255,255,.72)" : "#a3adba" }}>
                        {message.time}
                      </Typography>
                      {message.isMine && (
                        <DoneAllRoundedIcon sx={{ fontSize: 13, color: "rgba(255,255,255,.8)" }} />
                      )}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>

            <Box
              component="form"
              onSubmit={sendMessage}
              sx={{
                mx: { xs: 1, sm: 2.5 },
                mb: { xs: 1, sm: 2 },
                px: 1.25,
                py: 1,
                display: "flex",
                alignItems: "flex-end",
                gap: 0.5,
                border: "1px solid #e5eaf0",
                borderRadius: 3,
                bgcolor: "#fff",
                boxShadow: "0 4px 16px rgba(36,54,78,.04)",
              }}
            >
              <Tooltip title="Đính kèm tệp">
                <IconButton type="button" aria-label="Đính kèm tệp" sx={{ color: "#7b8a9b" }}>
                  <AttachFileRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <InputBase
                fullWidth
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Nhập tin nhắn..."
                inputProps={{ "aria-label": "Nhập tin nhắn" }}
                sx={{ px: 0.5, py: 0.8, fontSize: 13.5, color: "#263445" }}
              />
              <Tooltip title="Biểu tượng cảm xúc">
                <IconButton type="button" aria-label="Biểu tượng cảm xúc" sx={{ color: "#7b8a9b", display: { xs: "none", sm: "inline-flex" } }}>
                  <SentimentSatisfiedAltRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Gửi tin nhắn">
                <span>
                  <IconButton
                    type="submit"
                    aria-label="Gửi tin nhắn"
                    disabled={!draft.trim()}
                    sx={{
                      width: 38,
                      height: 38,
                      color: "white",
                      bgcolor: "#0866ff",
                      borderRadius: 2.5,
                      "&:hover": { bgcolor: "#0059e6" },
                      "&.Mui-disabled": { bgcolor: "#e8edf3", color: "#a5afbb" },
                    }}
                  >
                    <SendRoundedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </>
        ) : (
          <Box sx={{ flex: 1, display: "grid", placeItems: "center", color: "#8c98a7" }}>
            <Box sx={{ textAlign: "center" }}>
              <ChatRoundedIcon sx={{ fontSize: 48, color: "#b7c8df", mb: 1 }} />
              <Typography sx={{ fontWeight: 600 }}>Chọn một cuộc trò chuyện</Typography>
              <Typography sx={{ fontSize: 13, mt: 0.5 }}>Tin nhắn của bạn sẽ xuất hiện ở đây.</Typography>
            </Box>
          </Box>
        )}
      </Box>

      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <Box component="form" onSubmit={startConversation}>
          <DialogTitle sx={{ pb: 1 }}>Cuộc trò chuyện mới</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2, color: "#7b8795", fontSize: 13 }}>
              Nhập tên người bạn muốn bắt đầu trò chuyện.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="Tên người nhận"
              value={newConversationName}
              onChange={(event) => setNewConversationName(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 80 } }}
              required
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setCreateDialogOpen(false)} color="inherit">
              Hủy
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<PersonAddAltRoundedIcon />}
              disabled={!newConversationName.trim()}
            >
              Bắt đầu chat
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
