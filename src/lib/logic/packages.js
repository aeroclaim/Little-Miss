function weightedPick(entries, remaining, random) {
  const maximum = Math.max(...entries.map((entry) => remaining[entry.serial]));
  const candidates = entries.filter((entry) => remaining[entry.serial] >= maximum * 0.8);
  const totalWeight = candidates.reduce((sum, entry) => sum + remaining[entry.serial], 0);
  let choice = random() * totalWeight;
  for (const entry of candidates) {
    choice -= remaining[entry.serial];
    if (choice <= 0) return entry;
  }
  return candidates[candidates.length - 1];
}

export function townAssignments(townName, towns = []) {
  const townKey = String(townName || '').trim().toLocaleLowerCase();
  const town = towns.find((entry) => String(entry.name || '').trim().toLocaleLowerCase() === townKey);
  return (town?.assigned_serials || []).map(Number).filter((serial) => Number.isInteger(serial) && serial > 0);
}

export function generatePackageContents({ packages, recipes, catalog, stock, existingPackages = [], random = Math.random }) {
  const selectedIds = new Set(packages.map((pkg) => pkg.id));
  const reservedBySerial = {};
  for (const pkg of existingPackages) {
    if (pkg.status !== 'ready') continue;
    for (const item of pkg.items || []) {
      reservedBySerial[item.serial_number] = (reservedBySerial[item.serial_number] || 0) + Number(item.quantity || 0);
    }
  }
  const remaining = Object.fromEntries(
    catalog.map((entry) => {
      const current = stock[entry.serial] || {};
      const available = Number(current.available) || 0;
      const physicalAvailable = current.physicalAvailable == null
        ? available + (reservedBySerial[entry.serial] || 0)
        : Number(current.physicalAvailable) || 0;
      return [entry.serial, Math.max(0, physicalAvailable)];
    })
  );
  for (const pkg of existingPackages) {
    if (pkg.status !== 'ready' || selectedIds.has(pkg.id)) continue;
    for (const item of pkg.items || []) remaining[item.serial_number] = (remaining[item.serial_number] || 0) - Number(item.quantity || 0);
  }
  const assignedByTown = new Map();
  const generated = [];

  for (const pkg of packages) {
    let assigned = assignedByTown.get(pkg.town);
    if (!assigned) {
      assigned = new Set((pkg.assigned_serials || []).map(Number));
      assignedByTown.set(pkg.town, assigned);
    }
    const selected = new Set();
    const quantities = {};

    for (const recipe of recipes) {
      const numberCount = Math.floor(Number(recipe.number_count));
      const copiesEach = Math.floor(Number(recipe.copies_each));
      if (!numberCount && !copiesEach) continue;
      if (!Number.isInteger(numberCount) || numberCount < 1 || !Number.isInteger(copiesEach) || copiesEach < 1) {
        throw new Error('Recipe counts must be positive whole numbers');
      }
      if (recipe.group === 'assigned' && assigned.size === 0) {
        throw new Error(`No town-assigned numbers are configured for package #${pkg.package_number} (${pkg.town || 'unknown town'}). Assign numbers to this town first.`);
      }

      for (let index = 0; index < numberCount; index += 1) {
        const eligible = catalog.filter((entry) => {
          const isAssigned = assigned.has(entry.serial);
          const matchesGroup = recipe.group === 'assigned' ? isAssigned : !isAssigned;
          return matchesGroup && !entry.product?.distribution_paused && !entry.product?.not_for_sale && !selected.has(entry.serial) && remaining[entry.serial] >= copiesEach;
        });
        if (!eligible.length) {
          const eligibleCount = catalog.filter((entry) => {
            const matchesGroup = recipe.group === 'assigned'
              ? assigned.has(entry.serial)
              : !assigned.has(entry.serial);
            return matchesGroup && !entry.product?.distribution_paused && !entry.product?.not_for_sale && remaining[entry.serial] >= copiesEach;
          }).length;
          const groupLabel = recipe.group === 'assigned' ? 'town-assigned' : 'out-of-town';
          throw new Error(
            `Not enough available ${groupLabel} stock for package #${pkg.package_number} (${pkg.town || 'unknown town'}): ` +
            `requested ${numberCount} distinct numbers × ${copiesEach}; only ${eligibleCount} eligible numbers remain.`
          );
        }
        const picked = weightedPick(eligible, remaining, random);
        remaining[picked.serial] -= copiesEach;
        selected.add(picked.serial);
        quantities[picked.serial] = (quantities[picked.serial] || 0) + copiesEach;
      }
    }

    const items = Object.entries(quantities)
      .map(([serial_number, quantity]) => ({ serial_number: Number(serial_number), quantity }))
      .sort((a, b) => a.serial_number - b.serial_number);
    generated.push({
      ...pkg,
      items,
      total_units: items.reduce((sum, item) => sum + item.quantity, 0),
      status: items.length ? 'ready' : 'draft',
    });
  }

  return generated;
}

export function packageBreakdown(items) {
  const groups = new Map();
  for (const item of items || []) {
    const quantity = Number(item.quantity) || 0;
    if (!groups.has(quantity)) groups.set(quantity, []);
    groups.get(quantity).push(Number(item.serial_number));
  }
  return [...groups]
    .sort(([a], [b]) => b - a)
    .map(([quantity, serials]) => `${serials.sort((a, b) => a - b).join(', ')} × ${quantity}`)
    .join(' · ');
}
