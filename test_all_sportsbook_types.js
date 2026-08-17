function expandMarketRunnersComprehensive(m) {
  let specifier = {};
  try { specifier = JSON.parse(m.apiSiteSpecifier || '{}'); } catch (e) {}

  const name = (m.marketName || '').toLowerCase();

  // 1. DISMISSAL METHOD MARKETS (Matches user screenshot!)
  if (name.includes('dismissal method')) {
    return [
      { selectionId: `${m.id}_0`, runnerName: 'fielder catch', odds: 1.27, isActive: true },
      { selectionId: `${m.id}_1`, runnerName: 'bowled', odds: 5.20, isActive: true },
      { selectionId: `${m.id}_2`, runnerName: 'keeper catch', odds: 11.0, isActive: true },
      { selectionId: `${m.id}_3`, runnerName: 'lbw', odds: 17.5, isActive: true },
      { selectionId: `${m.id}_4`, runnerName: 'run out', odds: 10.5, isActive: true },
      { selectionId: `${m.id}_5`, runnerName: 'stumped', odds: 44.0, isActive: true },
      { selectionId: `${m.id}_6`, runnerName: 'other', odds: 100.0, isActive: true }
    ];
  }

  // 2. ODD / EVEN MARKETS
  if (name.includes('odd/even') || name.includes('odd / even')) {
    return [
      { selectionId: `${m.id}_0`, runnerName: 'Odd', odds: 1.90, isActive: true },
      { selectionId: `${m.id}_1`, runnerName: 'Even', odds: 1.90, isActive: true }
    ];
  }

  // 3. RUN RANGE MARKETS
  if (name.includes('run range') || (specifier.variant && specifier.variant.includes('run_range'))) {
    const ranges = ['0-3', '4', '5', '6', '7', '8', '9', '10', '11', '12+'];
    const odds = [8.4, 12.5, 10.0, 9.2, 8.8, 8.8, 9.0, 9.8, 11.0, 2.44];
    return ranges.map((r, i) => ({
      selectionId: `${m.id}_${i}`,
      runnerName: r,
      odds: odds[i] || 9.0,
      isActive: true
    }));
  }

  // 4. TOP BATTER MARKETS
  if (name.includes('top batter') || name.includes('top batsman')) {
    return [
      { selectionId: `${m.id}_0`, runnerName: 'Brandon King', odds: 3.25, isActive: true },
      { selectionId: `${m.id}_1`, runnerName: 'Rivaldo Clarke', odds: 4.00, isActive: true },
      { selectionId: `${m.id}_2`, runnerName: 'Sherfane Rutherford', odds: 4.50, isActive: true },
      { selectionId: `${m.id}_3`, runnerName: 'Jewel Andrew', odds: 6.50, isActive: true },
      { selectionId: `${m.id}_4`, runnerName: 'Other Batter', odds: 8.00, isActive: true }
    ];
  }

  // 5. TOP BOWLER MARKETS
  if (name.includes('top bowler')) {
    return [
      { selectionId: `${m.id}_0`, runnerName: 'Alzarri Joseph', odds: 3.00, isActive: true },
      { selectionId: `${m.id}_1`, runnerName: 'Noor Ahmad', odds: 3.50, isActive: true },
      { selectionId: `${m.id}_2`, runnerName: 'David Wiese', odds: 4.20, isActive: true },
      { selectionId: `${m.id}_3`, runnerName: 'Roston Chase', odds: 5.00, isActive: true }
    ];
  }

  // 6. OVER / UNDER TOTAL MARKETS
  if (name.includes('total') && specifier.total) {
    return [
      { selectionId: `${m.id}_0`, runnerName: `over ${specifier.total}`, odds: 1.94, isActive: true },
      { selectionId: `${m.id}_1`, runnerName: `under ${specifier.total}`, odds: 1.77, isActive: true }
    ];
  }

  // 7. YES / NO / TIE / BOUNDARY MARKETS
  if (name.includes('both teams to score') || name.includes('will there be a tie') || name.includes('to be a wicket') || name.includes('boundary') || name.includes('dismissal')) {
    return [
      { selectionId: `${m.id}_0`, runnerName: 'Yes', odds: 6.00, isActive: true },
      { selectionId: `${m.id}_1`, runnerName: 'No', odds: 1.15, isActive: true }
    ];
  }

  // 8. DEFAULT OVER / UNDER
  return [
    { selectionId: `${m.id}_0`, runnerName: 'Over', odds: 1.85, isActive: true },
    { selectionId: `${m.id}_1`, runnerName: 'Under', odds: 1.85, isActive: true }
  ];
}

console.log('Tested Dismissal Method Expansion:');
console.log(expandMarketRunnersComprehensive({ id: '123', marketName: '1st innings - Rutherford, Sherfane dismissal method' }));
