// Turns the floors and buildings from the API into choices for a "floor" list.

export type FloorRecord = { id: string; level: string; buildingId: string };
export type BuildingRecord = { id: string; name: string; code: string };
export type FloorOption = { id: string; label: string };

// One choice per floor, labelled "Building name (CODE) - Level X",
// sorted by building and then by level (Level 2 comes before Level 10).
export function buildFloorOptions(floors: FloorRecord[], buildings: BuildingRecord[]): FloorOption[] {
  const buildingsById = new Map(buildings.map((building) => [building.id, building]));
  return floors
    .map((floor) => {
      const building = buildingsById.get(floor.buildingId);
      const place = building ? `${building.name} (${building.code})` : 'Unknown building';
      return { id: floor.id, label: `${place} - Level ${floor.level}` };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'en', { numeric: true }));
}

// The label of one floor, to show where a room is.
export function findFloorLabel(options: FloorOption[], floorId: string): string {
  return options.find((option) => option.id === floorId)?.label ?? 'Unknown floor';
}
