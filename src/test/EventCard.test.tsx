import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EventCard } from "@/components/EventCard";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockEvent = {
  id: "test-123",
  title: "Futebol no Parque",
  description: "Partida amistosa de futebol",
  category: "esportes",
  date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
  time: "14:00",
  location: "Parque Ibirapuera, São Paulo",
  created_by: "user-1",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  image_url: null,
  max_participants: 20,
  is_private: false,
  price: null,
  city: "São Paulo",
  state: "SP",
  participants_count: 5,
  creator_name: "João Silva",
  creator_avatar: null,
  average_rating: 4.5,
  review_count: 3,
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("EventCard", () => {
  it("renderiza título do evento", () => {
    renderWithProviders(<EventCard event={mockEvent} />);
    expect(screen.getByText("Futebol no Parque")).toBeInTheDocument();
  });

  it("renderiza localização", () => {
    renderWithProviders(<EventCard event={mockEvent} />);
    expect(screen.getByText(/Parque Ibirapuera/)).toBeInTheDocument();
  });

  it("renderiza contagem de participantes", () => {
    renderWithProviders(<EventCard event={mockEvent} />);
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });
});
