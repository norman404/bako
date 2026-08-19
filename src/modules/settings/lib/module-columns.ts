interface ColumnModule {
  id: string;
  flags: readonly string[];
}

interface ModuleColumn {
  id: string;
  modules: ColumnModule[];
}

// Balances both grid columns by flag count so short modules stack next to a tall one.
// Always returns both columns; the caller drops the empty one when a column has no modules.
function splitModulesIntoColumns(modules: readonly ColumnModule[]): ModuleColumn[] {
  const start: ColumnModule[] = [];
  const end: ColumnModule[] = [];
  let startFlags = 0;
  let endFlags = 0;

  for (const module of modules) {
    if (startFlags <= endFlags) {
      start.push(module);
      startFlags += module.flags.length;
    } else {
      end.push(module);
      endFlags += module.flags.length;
    }
  }

  return [
    { id: "start", modules: start },
    { id: "end", modules: end },
  ];
}

export { splitModulesIntoColumns, type ColumnModule, type ModuleColumn };
