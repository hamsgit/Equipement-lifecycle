/** Run from backend: npx tsx ../equipment_seed/seed.ts (copy this file into backend/scripts/seed.ts and use npx tsx scripts/seed.ts). */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const uuid = (n: number) => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
const date = (s: string) => new Date(`${s}T12:00:00.000Z`);
const pdfDir = resolve(process.cwd(), 'scripts', 'synthetic_pdfs');
const uploadDir = resolve(process.cwd(), 'uploads');
const manifestPath = resolve(process.cwd(), 'scripts', 'ground_truth.json');
const anomaly = (ruleId: string, affectedRecords: string[], expectedOutcome: string) => ({ ruleId, affectedRecords, expectedOutcome });

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    const db = app.get(PrismaService);
    mkdirSync(uploadDir, { recursive: true });
    const assets: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const id = uuid(i);
      assets.push(id);
      await db.asset.upsert({ where: { id }, update: {}, create: { id, assetCode: `SYN-ASSET-${String(i).padStart(3,'0')}`, assetType: 'SYNTHETIC_TEST_RIG', status: 'ACTIVE' } });
    }
    const components: string[] = [];
    for (let i = 1; i <= 10; i++) {
      const id = uuid(100+i);
      components.push(id);
      const existing = await db.component.findUnique({ where: { id } });
      if (!existing) await db.component.create({ data: { id, serialNumber: `SYN-SERIAL-${String(i).padStart(3,'0')}`, partNumber: `SYN-PART-${String(i).padStart(3,'0')}`, componentType: 'SYNTHETIC_MODULE' } });
    }
    const docs = [];
    for (let i = 1; i <= 15; i++) {
      const id = uuid(200+i);
      const filename = `SYNTHETIC_${String(i).padStart(2,'0')}.pdf`;
      const bytes = readFileSync(join(pdfDir, filename));
      const sha256Hash = createHash('sha256').update(bytes).digest('hex');
      const storagePath = join(uploadDir, filename);
      if (!existsSync(storagePath)) copyFileSync(join(pdfDir, filename), storagePath);
      const existing = await db.document.findUnique({ where: { id } });
      if (!existing) {
        await db.document.create({ data: { id, originalFilename: filename, mimeType: 'application/pdf', fileSize: bytes.length, storagePath, sha256Hash, documentType: ['COMPONENT_STATUS','INSTALLATION_REMOVAL','MAINTENANCE'][(i-1)%3], processingStatus: 'PROCESSED' } });
      }
      docs.push(id);
            const values: Record<string,string> = {
        'Asset ID': `SYN-ASSET-${String(((i-1)%3)+1).padStart(3,'0')}`,
        'Component ID': `SYN-COMP-${String(((i-1)%10)+1).padStart(3,'0')}`,
        'Part Number': i===3 ? 'SYN-PART-CONFLICT' : `SYN-PART-${String(((i-1)%10)+1).padStart(3,'0')}`,
        'Serial Number': i===2 ? 'SYN-SERIAL-CONFLICT' : `SYN-SERIAL-${String(((i-1)%10)+1).padStart(3,'0')}`,
        'Document Date': `2026-01-${String(i).padStart(2,'0')}`,
        'Event Date': `2026-01-${String(i).padStart(2,'0')}`,
        'Operating Hours': String(i*100),
        'Usage Count': String(i*10),
        'Operator': 'Synthetic Demo Reviewer',
      };
      for (const [index, [fieldName, rawValue]] of Object.entries(values).entries()) {
        const fieldId = uuid(10000+i*100+index);
        if (!(await db.extractedField.findUnique({ where: { id: fieldId } }))) {
          await db.extractedField.create({ data: { id: fieldId, documentId: id, fieldName, rawValue, normalizedValue: rawValue, pageNumber: 1, sourceText: `${fieldName}: ${rawValue}`, extractionMethod: 'SYNTHETIC_TEMPLATE', reviewStatus: 'UNREVIEWED' } });
        }
      }
    }
    const assignments: Array<{ id: string; componentId: string; assetId: string; installedAt: Date; removedAt: Date | null }> = [];
    const assign = async (n:number, ci:number, ai:number, start:string, end:string|null) => {
      const id=uuid(300+n); const data={id,componentId:components[ci-1],assetId:assets[ai-1],installedAt:date(start),removedAt:end?date(end):null};
      assignments.push(data);
      if (!(await db.assetAssignment.findUnique({where:{id}}))) await db.assetAssignment.create({data});
    };
    await assign(1,1,1,'2026-01-01','2026-01-10');
    await assign(2,1,2,'2026-01-08','2026-01-18'); // VAL-05
    await assign(3,2,1,'2026-01-01','2026-01-03');
    await assign(4,2,2,'2026-03-15','2026-03-25'); // VAL-06
    await assign(5,3,1,'2026-02-10','2026-02-01'); // VAL-03
    for (let i=4;i<=10;i++) await assign(i+2,i,((i-1)%3)+1,'2026-01-01','2026-02-01');

    const events: Array<{id:string;eventType:string;componentId:string;assetId:string;eventDate:Date;operatingHours:number;usageCount:number;documentId:string|null}> = [];
    for (let i=1;i<=40;i++) {
      const ci=((i-1)%10)+1;
      const assetIndex=((ci-1)%3);
      const sequence=Math.floor((i-1)/10);
      let eventType=['INSTALLED','OPERATING_READING','MAINTENANCE','REMOVED'][sequence];
      let hours=sequence*100+i;
      let count=sequence*10+i;
      if (i===12) hours=1; // VAL-07, compared against earlier reading for component 2
      if (i===13) count=0; // VAL-08 for component 3
      if (i===31) eventType='REMOVED'; // removal event without earlier matching asset install if asset differs below
      const eventAssetId=i===31 ? assets[2] : assets[assetIndex];
      const eventDate=date(`2026-${String(sequence+1).padStart(2,'0')}-${String(ci).padStart(2,'0')}`);
      const documentId=i===40?null:docs[(i-1)%15]; // VAL-10
      const id=uuid(400+i);
      events.push({id,eventType,componentId:components[ci-1],assetId:eventAssetId,eventDate,operatingHours:hours,usageCount:count,documentId});
      if (!(await db.lifecycleEvent.findUnique({where:{id}}))) {
        await db.lifecycleEvent.create({data:{id,eventType,componentId:components[ci-1],assetId:eventAssetId,eventDate,operatingHours:hours,usageCount:count,description:'SYNTHETIC DEMONSTRATION EVENT'}});
      }
      if (documentId) {
        const evidenceId=uuid(20000+i);
        if (!(await db.eventEvidence.findUnique({where:{id:evidenceId}}))) await db.eventEvidence.create({data:{id:evidenceId,eventId:id,documentId,pageNumber:1,sourceText:'Synthetic demonstration source record'}});
      }
    }
    // VAL-09: second event with same identity but differing readings, using deterministic ID.
    const first=events[4];
    const conflictId=uuid(499);
    if (!(await db.lifecycleEvent.findUnique({where:{id:conflictId}}))) await db.lifecycleEvent.create({data:{id:conflictId,eventType:first.eventType,componentId:first.componentId,assetId:first.assetId,eventDate:first.eventDate,operatingHours:999,usageCount:999,description:'SYNTHETIC CONFLICTING EVENT'}});
    const conflictEvidenceId=uuid(20499);
    if (!(await db.eventEvidence.findUnique({where:{id:conflictEvidenceId}}))) await db.eventEvidence.create({data:{id:conflictEvidenceId,eventId:conflictId,documentId:docs[14],pageNumber:1,sourceText:'Synthetic conflicting event evidence'}});
    const groundTruth={ synthetic:true, generatedAt:'2026-10-21', minimums:{assets:3,components:10,pdfs:15,lifecycleEvents:40}, anomalies:[
      anomaly('VAL-01',[docs[1]],'Conflicting serial numbers for SYN-COMP-002 across documents 2 and 12'),
      anomaly('VAL-02',[docs[2],components[2]],'Conflicting part number for serial SYN-SERIAL-003'),
      anomaly('VAL-03',[uuid(305)],'Removal date precedes installation date'),
      anomaly('VAL-04',[events[30].id],'Removal without installation on same asset'),
      anomaly('VAL-05',[uuid(301),uuid(302)],'Overlapping installation intervals'),
      anomaly('VAL-06',[uuid(303),uuid(304)],'Coverage gap greater than configured 30 days'),
      anomaly('VAL-07',[events[1].id,events[11].id],'Operating hours decrease'),
      anomaly('VAL-08',[events[2].id,events[12].id],'Usage count decreases'),
      anomaly('VAL-09',[first.id,conflictId],'Conflicting measurements for identical event identity'),
      anomaly('VAL-10',[events[39].id],'Missing event evidence'),
    ], limitations:['VAL-04 may not trigger because earlier matching installation/assignment records exist; verify against actual rule output.','Synthetic event evidence links demonstrate database provenance but not always matching field content in the PDF; production-grade traceability is not yet satisfied.']};
    writeFileSync(manifestPath,JSON.stringify(groundTruth,null,2));
    console.log('Seed complete: 3 assets, 10 components, 15 PDFs, 41 events, 12 assignments.');
    console.log(`Ground truth: ${manifestPath}`);
  } finally { await app.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});

