const fs = require('fs');
const file = 'src/components/WorkerScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/ward_id:\s*number;/g, 'ward_id?: number;\n  ward_ids?: number[];\n  in_progress_at?: string;\n  resolved_at?: string;');

// Fix the query in fetchReports:
// .eq('ward_id', targetWardId) -> .contains('ward_ids', [targetWardId])
content = content.replace(/\.eq\('ward_id',\s*targetWardId\)/g, ".contains('ward_ids', [targetWardId])");

// Update handleUpdateStatus to inject timestamps
content = content.replace(/status:\s*newStatus,/g, "status: newStatus,\n      ...(newStatus === 'in_progress' ? { in_progress_at: new Date().toISOString() } : {}),\n      ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),");

fs.writeFileSync(file, content, 'utf8');
console.log('WorkerScreen.tsx updated successfully.');
