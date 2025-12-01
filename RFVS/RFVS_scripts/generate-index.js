const fs = require('fs');
const path = require('path');

const jobsDir = path.join(__dirname, '..', 'RFVS_jobs');
const indexFile = path.join(jobsDir, 'RFVS_index.json');

console.log('🔍 Scanning for RFVS job files...');
console.log('📁 Jobs directory:', jobsDir);

// Ensure jobs directory exists
if (!fs.existsSync(jobsDir)) {
    console.error('❌ Error: RFVS_jobs directory not found!');
    process.exit(1);
}

// Find all job files
const allFiles = fs.readdirSync(jobsDir);
const jobFiles = allFiles.filter(file => 
    file.startsWith('RFVS_role-jobs-') && file.endsWith('.json')
);

console.log(`✅ Found ${jobFiles.length} job file(s)`);

if (jobFiles.length === 0) {
    console.log('⚠️  No job files found matching pattern: RFVS_role-jobs-*.json');
    // Create empty index
    fs.writeFileSync(indexFile, JSON.stringify([], null, 2));
    console.log('📝 Created empty RFVS_index.json');
    process.exit(0);
}

// Read each job file and extract metadata
const jobs = [];
const errors = [];

jobFiles.forEach(filename => {
    try {
        const filePath = path.join(jobsDir, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        const job = JSON.parse(content);
        
        // Validate required fields
        if (!job.id || !job.title || !job.type || !job.location || !job.summary) {
            errors.push(`${filename}: Missing required fields`);
            return;
        }
        
        jobs.push({
            id: job.id,
            title: job.title,
            type: job.type,
            location: job.location,
            summary: job.summary,
            filename: filename
        });
        
        console.log(`  ✓ ${job.title}`);
        
    } catch (error) {
        errors.push(`${filename}: ${error.message}`);
    }
});

// Report any errors
if (errors.length > 0) {
    console.error('\n❌ Errors encountered:');
    errors.forEach(err => console.error(`  - ${err}`));
}

// Write index file
fs.writeFileSync(indexFile, JSON.stringify(jobs, null, 2));
console.log(`\n✅ Generated RFVS_index.json with ${jobs.length} job(s)`);

if (jobs.length > 0) {
    console.log('\n📋 Jobs in index:');
    jobs.forEach((job, i) => {
        console.log(`  ${i + 1}. ${job.title} (${job.type})`);
    });
}

console.log('\n✨ Done!');
