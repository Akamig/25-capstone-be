-- CreateTable
CREATE TABLE "SeatLayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "canvasSize" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Seat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seatName" TEXT NOT NULL,
    "seatX" INTEGER NOT NULL,
    "seatY" INTEGER NOT NULL,
    "layoutId" TEXT NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Seat_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "SeatLayout" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Seat_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SeatModule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeatModule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "occupied" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SeatModuleStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batteryLevel" INTEGER NOT NULL,
    "voltage" REAL NOT NULL,
    "uptimeSec" INTEGER NOT NULL,
    "lastSeen" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Seat_seatName_key" ON "Seat"("seatName");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_moduleId_key" ON "Seat"("moduleId");
