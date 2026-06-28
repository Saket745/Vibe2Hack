const fs = require('fs');
const file = 'src/components/DashboardScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace Report interface
const interfaceTarget = `ward_id: number;\n  wards?: {\n    name: string;\n  };`;
const interfaceReplacement = `ward_id?: number;\n  ward_ids?: number[];\n  in_progress_at?: string;\n  resolved_at?: string;\n  wards?: {\n    name: string;\n  };`;
content = content.replace(interfaceTarget, interfaceReplacement);

// Add SLA calculation in wardStats reducer
const wardStatsTarget = `  const wardStats = reports.reduce((acc, r) => {\n    const wardName = r.wards?.name || \`Ward ${r.ward_id}\`;\n    if (!acc[wardName]) acc[wardName] = { name: wardName, resolved: 0, total: 0 };\n    acc[wardName].total += 1;\n    if (r.status === 'resolved') acc[wardName].resolved += 1;\n    return acc;\n  }, {} as Record<string, { name: string; resolved: number; total: number }>);`;

const wardStatsReplacement = `  const wardStats = reports.reduce((acc, r) => {
    const wardName = r.wards?.name || \`Ward \${r.ward_ids?.[0] || r.ward_id}\`;
    if (!acc[wardName]) acc[wardName] = { name: wardName, resolved: 0, total: 0, total_sla_ms: 0 };
    acc[wardName].total += 1;
    if (r.status === 'resolved') {
      acc[wardName].resolved += 1;
      if (r.created_at && r.resolved_at) {
        acc[wardName].total_sla_ms += new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime();
      }
    }
    return acc;
  }, {} as Record<string, { name: string; resolved: number; total: number; total_sla_ms: number }>);`;

content = content.replace(wardStatsTarget, wardStatsReplacement);

// Add global Avg SLA calculation before Return
const beforeReturnTarget = `  return (\n    <div className="max-w-md mx-auto my-6 px-4 md:px-0 space-y-6 animate-in fade-in duration-200">`;
const beforeReturnReplacement = `
  // 5. Global Avg SLA Calculation
  let totalResolvedSlaMs = 0;
  let resolvedWithSlaCount = 0;
  reports.forEach(r => {
    if (r.status === 'resolved' && r.created_at && r.resolved_at) {
      totalResolvedSlaMs += new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime();
      resolvedWithSlaCount += 1;
    }
  });
  const avgSlaHours = resolvedWithSlaCount > 0 ? (totalResolvedSlaMs / resolvedWithSlaCount) / (1000 * 60 * 60) : 0;

  return (
    <div className="max-w-md mx-auto my-6 px-4 md:px-0 space-y-6 animate-in fade-in duration-200">`;
content = content.replace(beforeReturnTarget, beforeReturnReplacement);

// Replace "Resolved" card with "Avg SLA" or add it
const cardsTarget = `{ label: 'Resolved', colorClass: 'text-emerald-600 dark:text-emerald-500', val: \`\${resolvedRate.toFixed(0)}%\` }`;
const cardsReplacement = `{ label: 'Resolved', colorClass: 'text-emerald-600 dark:text-emerald-500', val: \`\${resolvedRate.toFixed(0)}%\` },
          { label: 'Avg SLA', colorClass: 'text-blue-600 dark:text-blue-500', val: \`\${avgSlaHours.toFixed(1)}h\` }`;
content = content.replace(cardsTarget, cardsReplacement);
// Make grid-cols-4 into grid-cols-5
content = content.replace(`className="grid grid-cols-4 gap-2"`, `className="grid grid-cols-5 gap-2"`);

// Update Leaderboard display
const lbTarget = `<span className="text-sm font-bold text-slate-800 dark:text-white">{stat.resolved}</span>\n                    <span className="text-xs text-slate-400 font-medium">resolved</span>`;
const lbReplacement = `<div className="text-right">
                      <div className="text-sm font-bold text-slate-800 dark:text-white flex items-center justify-end gap-1">
                        {stat.resolved} <span className="text-xs text-slate-400 font-normal">resolved</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {stat.resolved > 0 ? \`\${((stat.total_sla_ms / stat.resolved) / (1000 * 60 * 60)).toFixed(1)}h avg SLA\` : 'No SLA data'}
                      </div>
                    </div>`;
content = content.replace(lbTarget, lbReplacement);

fs.writeFileSync(file, content, 'utf8');
console.log('DashboardScreen.tsx updated successfully.');
