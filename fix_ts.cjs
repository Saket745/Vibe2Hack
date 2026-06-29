const fs = require('fs');

// Fix CopilotWidget.tsx
let cw = fs.readFileSync('src/components/CopilotWidget.tsx', 'utf8');
cw = cw.replace(/import React, \{ useState \} from 'react';/, "import { useState } from 'react';");
cw = cw.replace(/catch \(err\)/, "catch (_err)");
fs.writeFileSync('src/components/CopilotWidget.tsx', cw);

// Fix RecommendationEngine.ts
let re = fs.readFileSync('src/lib/RecommendationEngine.ts', 'utf8');
re = re.replace(/import \{ IncidentCluster \}/, "import type { IncidentCluster }");
fs.writeFileSync('src/lib/RecommendationEngine.ts', re);

// Fix IntegrationService.ts
let is = fs.readFileSync('src/lib/IntegrationService.ts', 'utf8');
is = is.replace(/SystemMonitoringService.logError\(`Integration Delivery Failed: \$\{integration\.name\}`, 'IntegrationService', \{[^}]+\}\);/s, "SystemMonitoringService.logError(new Error(`Integration Delivery Failed: ${integration.name}`), 'IntegrationService');");
fs.writeFileSync('src/lib/IntegrationService.ts', is);

// Fix RuleEngine.ts
let ru = fs.readFileSync('src/lib/RuleEngine.ts', 'utf8');
ru = ru.replace(/executeActions\(actions: RuleAction\[\], contextData: any\)/, "executeActions(actions: RuleAction[], _contextData: any)");
fs.writeFileSync('src/lib/RuleEngine.ts', ru);

// Fix triage-webhook.ts
let tw = fs.readFileSync('api/triage-webhook.ts', 'utf8');
tw = tw.replace(/const \{ id: reportId, image_url: tempStoragePath, reporter_id: reporterId, description, latitude, longitude \} = record;/, "const { id: reportId, image_url: tempStoragePath, reporter_id: reporterId, latitude, longitude } = record;");
fs.writeFileSync('api/triage-webhook.ts', tw);

// Fix seed_demo.ts
let sd = fs.readFileSync('scripts/seed_demo.ts', 'utf8');
sd = sd.replace(/const \{ data, error \} = await supabase\.from\('wards'\)/, "const { data } = await supabase.from('wards')");
fs.writeFileSync('scripts/seed_demo.ts', sd);

// Fix WorkerScreen.tsx
let ws = fs.readFileSync('src/components/WorkerScreen.tsx', 'utf8');
ws = ws.replace(/catch \(_\) \{/, "catch (_err) {");
fs.writeFileSync('src/components/WorkerScreen.tsx', ws);

// Fix supabaseClient.ts
let sc = fs.readFileSync('src/lib/supabaseClient.ts', 'utf8');
sc = sc.replace(/catch \(e\) \{/, "catch (_e) {");
sc = sc.replace(/select: \(fields\?: string\) => \{/g, "select: (_fields?: string) => {");
sc = sc.replace(/i\[col\] === val/g, "(i as any)[col] === val");
fs.writeFileSync('src/lib/supabaseClient.ts', sc);

console.log('Fixed');
