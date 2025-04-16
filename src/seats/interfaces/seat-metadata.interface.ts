export interface SeatPosition {
  seatId: string;
  x: number;
  y: number;
}

export interface SeatLayout {
  name: string;
  seats: SeatPosition[];
}

export interface SeatMetadata {
  id: string;
  name: string;
  layouts: {
    [layoutName: string]: SeatLayout;
  };
  currentLayout: string;
}
