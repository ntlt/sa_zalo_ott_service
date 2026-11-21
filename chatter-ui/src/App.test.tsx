import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Dashboard from "./component/auth/Dashboard";
import { graphqlRequest } from "./services/graphql";

jest.mock("./services/graphql", () => ({
  graphqlRequest: jest.fn(),
  getAccessToken: jest.fn(() => null),
}));

jest.mock("@mui/material/Dialog", () => ({
  __esModule: true,
  default: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div role="dialog">{children}</div> : null),
}));

const request = graphqlRequest as jest.MockedFunction<typeof graphqlRequest>;
const currentUserId = "507f1f77bcf86cd799439011";
const otherUser = {
  id: "507f1f77bcf86cd799439012",
  email: "friend@example.com",
  displayName: "Người bạn",
};
const directConversation = {
  id: "direct-id",
  type: "DIRECT" as const,
  title: null,
  createdBy: currentUserId,
  createdAt: "2026-11-16T00:00:00.000Z",
  members: [
    { userId: currentUserId, displayName: "Tôi", role: "MEMBER" as const },
    { userId: otherUser.id, displayName: otherUser.displayName, role: "MEMBER" as const },
  ],
};

const groupConversation = {
  id: "group-id",
  type: "GROUP" as const,
  title: "Nhóm học tập",
  createdBy: currentUserId,
  createdAt: "2026-11-16T00:00:00.000Z",
  members: [
    { userId: currentUserId, displayName: "Tôi", role: "OWNER" as const },
    { userId: otherUser.id, displayName: otherUser.displayName, role: "MEMBER" as const },
  ],
};

const renderDashboard = () =>
  render(<Dashboard currentUserId={currentUserId} />);

beforeEach(() => {
  request.mockReset();
  request.mockResolvedValue({ myConversations: [directConversation, groupConversation] });
});

test("loads real conversations and filters between direct chats and groups", async () => {
  renderDashboard();

  expect(await screen.findByLabelText("Mở cuộc trò chuyện Người bạn")).toBeInTheDocument();
  expect(screen.getByLabelText("Mở cuộc trò chuyện Nhóm học tập")).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText("Danh bạ"));
  expect(screen.getByLabelText("Mở cuộc trò chuyện Người bạn")).toBeInTheDocument();
  expect(screen.queryByLabelText("Mở cuộc trò chuyện Nhóm học tập")).not.toBeInTheDocument();

  fireEvent.click(screen.getByLabelText("Nhóm"));
  expect(screen.getByLabelText("Mở cuộc trò chuyện Nhóm học tập")).toBeInTheDocument();
  expect(screen.queryByLabelText("Mở cuộc trò chuyện Người bạn")).not.toBeInTheDocument();
});

test("opens a direct conversation by looking up the recipient email", async () => {
  request.mockImplementation(async (query: string) => {
    if (query.includes("MyConversations")) {
      return { myConversations: [directConversation] };
    }
    if (query.includes("UserByEmail")) return { userByEmail: otherUser };
    if (query.includes("CallHistory")) return { callHistory: [] };
    return { openDirectConversation: { id: directConversation.id } };
  });
  renderDashboard();
  await screen.findByLabelText("Mở cuộc trò chuyện Người bạn");

  fireEvent.click(screen.getByLabelText("Tạo cuộc trò chuyện mới"));
  fireEvent.change(screen.getByLabelText("Email người dùng"), {
    target: { value: otherUser.email },
  });
  fireEvent.click(screen.getByText("Mở chat"));

  await waitFor(() => {
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining("openDirectConversation"),
      { userId: otherUser.id },
    );
  });
});

test("creates a group with users selected by email", async () => {
  request.mockImplementation(async (query: string) => {
    if (query.includes("MyConversations")) {
      return { myConversations: [directConversation, groupConversation] };
    }
    if (query.includes("UserByEmail")) return { userByEmail: otherUser };
    return { createGroup: { id: groupConversation.id } };
  });
  renderDashboard();
  await screen.findByLabelText("Mở cuộc trò chuyện Người bạn");

  fireEvent.click(screen.getByLabelText("Tạo cuộc trò chuyện mới"));
  fireEvent.click(screen.getByLabelText("Chuyển sang tạo nhóm"));
  fireEvent.change(await screen.findByLabelText("Tên nhóm"), {
    target: { value: groupConversation.title },
  });
  expect(screen.getByLabelText("Tên nhóm")).toHaveValue(groupConversation.title);
  expect(screen.getByLabelText("Tạo nhóm ngay")).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Email người dùng"), {
    target: { value: otherUser.email },
  });
  fireEvent.click(screen.getByText("Thêm"));
  await waitFor(() => {
    expect(screen.getByLabelText("Tạo nhóm ngay")).toBeEnabled();
  });
  fireEvent.click(screen.getByLabelText("Tạo nhóm ngay"));

  await waitFor(() => {
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining("mutation CreateGroup"),
      { input: { title: groupConversation.title, memberIds: [otherUser.id] } },
    );
  });
});

test("shows backend errors instead of silently falling back to sample data", async () => {
  request.mockRejectedValue(new Error("Không kết nối được máy chủ"));
  renderDashboard();

  expect(await screen.findByText("Không kết nối được máy chủ")).toBeInTheDocument();
  expect(screen.queryByText("KTPM_261")).not.toBeInTheDocument();
});
