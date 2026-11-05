import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Dashboard from "./component/auth/Dashboard";

beforeEach(() => {
  window.localStorage.clear();
});

const clickButton = (label: string) => {
  const button = screen
    .getAllByLabelText(label)
    .find((element) => element.tagName === "BUTTON");
  if (!button) throw new Error(`Button "${label}" was not found`);
  fireEvent.click(button);
};

test("shows conversations and sends a message", () => {
  render(<Dashboard />);

  expect(screen.getByText("Tin nhắn")).toBeInTheDocument();
  expect(
    screen.getByLabelText("Mở cuộc trò chuyện KTPM_261"),
  ).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Nhập tin nhắn"), {
    target: { value: "Xin chào cả nhóm" },
  });
  clickButton("Gửi tin nhắn");

  expect(screen.getByText("Xin chào cả nhóm")).toBeInTheDocument();
});

test("restores sent messages after the dashboard is remounted", async () => {
  const firstRender = render(<Dashboard />);
  fireEvent.change(screen.getByLabelText("Nhập tin nhắn"), {
    target: { value: "Tin nhắn được lưu" },
  });
  clickButton("Gửi tin nhắn");

  await waitFor(() => {
    expect(window.localStorage.getItem("chatter.conversations")).toContain(
      "Tin nhắn được lưu",
    );
  });

  firstRender.unmount();
  render(<Dashboard />);

  expect(screen.getByText("Tin nhắn được lưu")).toBeInTheDocument();
});

test("switches between contacts and groups", () => {
  render(<Dashboard />);

  fireEvent.click(screen.getByLabelText("Danh bạ"));
  expect(screen.getByText("Khải Nguyễn")).toBeInTheDocument();
  expect(screen.queryByText("KTPM_261")).not.toBeInTheDocument();

  fireEvent.click(screen.getByLabelText("Nhóm"));
  expect(screen.getByText("KTPM_261")).toBeInTheDocument();
  expect(screen.queryByText("Khải Nguyễn")).not.toBeInTheDocument();
});

test("searches conversation names and message previews", () => {
  render(<Dashboard />);

  fireEvent.change(screen.getByLabelText("Tìm kiếm cuộc trò chuyện"), {
    target: { value: "push code" },
  });

  expect(
    screen.getByLabelText("Mở cuộc trò chuyện KTPM_261"),
  ).toBeInTheDocument();
  expect(screen.queryByText("Khải Nguyễn")).not.toBeInTheDocument();
});
