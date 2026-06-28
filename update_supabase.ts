import * as fs from 'fs';
const file = 'src/lib/supabaseClient.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace single ward_id: N with ward_ids: [N]
content = content.replace(/ward_id:\s*(\d+),/g, 'ward_ids: [],');
content = content.replace(/ward_id:\s*(\d+)\s*\}/g, 'ward_ids: [] }');

// add .contains to the mock query builder
if(content.includes('contains(col: string, arr: any[])') === false) {
    const replacement = 
            eq(col: string, val: any) {
              this.data = this.data.filter((i: any) => i[col] === val);
              return this;
            },
            contains(col: string, arr: any[]) {
              this.data = this.data.filter((i: any) => {
                if (Array.isArray(i[col])) {
                  return arr.some(v => i[col].includes(v));
                }
                return false;
              });
              return this;
            },
;
    content = content.replace(/eq\(col: string, val: any\) \{\s*this\.data = this\.data\.filter\(\(i: any\) => i\[col\] === val\);\s*return this;\s*\}/g, replacement.trim());
}

// Add fake dates for in_progress and resolved
let reportRegex = /\{\s*id:\s*'mock-report-\d+',[\s\S]*?dedupe_hash:\s*'[^']+'\s*\}/g;
content = content.replace(reportRegex, (match) => {
    if (match.includes('in_progress_at:')) return match; 
    let created_at_match = match.match(/created_at:\s*'([^']+)'/);
    let status_match = match.match(/status:\s*'([^']+)'/);
    if (!created_at_match || !status_match) return match;
    let createdDate = new Date(created_at_match[1]);
    let status = status_match[1];
    
    let injections = '';
    if (status === 'in_progress' || status === 'resolved') {
        let inProgDate = new Date(createdDate.getTime() + (Math.random() * 2 + 1) * 3600000); 
        injections += \n          in_progress_at: '',;
        
        if (status === 'resolved') {
            let resDate = new Date(inProgDate.getTime() + (Math.random() * 24 + 1) * 3600000); 
            injections += \n          resolved_at: '',;
        }
    }
    
    return match.replace(/dedupe_hash:/, injections.trimStart() + '\n          dedupe_hash:');
});

content = content.replace(/wards: defaultWards\.find\(w => w\.id === item\.ward_id\) \|\| \{ name: 'Unknown Ward' \}/g, "wards: defaultWards.find(w => item.ward_ids && item.ward_ids.includes(w.id)) || { name: 'Unknown Ward' }");

fs.writeFileSync(file, content, 'utf8');
console.log('supabaseClient.ts updated successfully.');
