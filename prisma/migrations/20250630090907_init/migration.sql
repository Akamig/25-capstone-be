-- CreateTable
CREATE TABLE "SeatLayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "canvasSize" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Seat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seatName" TEXT NOT NULL,
    "seatX" INTEGER NOT NULL,
    "seatY" INTEGER NOT NULL,
    "layoutId" TEXT NOT NULL,
    CONSTRAINT "Seat_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "SeatLayout" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeatModule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "occupied" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seatId" TEXT NOT NULL,
    CONSTRAINT "SeatModule_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeatModuleStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batteryLevel" INTEGER NOT NULL,
    "voltage" REAL NOT NULL,
    "uptimeSec" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Seat_layoutId_key" ON "Seat"("layoutId");

-- CreateIndex
CREATE UNIQUE INDEX "SeatModule_seatId_key" ON "SeatModule"("seatId");
