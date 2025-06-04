const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  try {
    console.log('Loading migration file...')
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20240322000000_enhance_portfolio_history.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('Applying migration...')
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }
    
    console.log('Migration applied successfully!')
    console.log('Result:', data)
    
  } catch (err) {
    console.error('Error applying migration:', err)
    process.exit(1)
  }
}

// Alternative method using direct SQL execution
async function applyMigrationDirect() {
  try {
    console.log('Loading migration file...')
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20240322000000_enhance_portfolio_history.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`Executing ${statements.length} SQL statements...`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`)
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
          
          if (error) {
            console.error(`Error in statement ${i + 1}:`, error)
            console.error('Statement:', statement)
            // Continue with other statements
          } else {
            console.log(`Statement ${i + 1} executed successfully`)
          }
        } catch (err) {
          console.error(`Error executing statement ${i + 1}:`, err)
          console.error('Statement:', statement)
        }
      }
    }
    
    console.log('Migration application completed!')
    
  } catch (err) {
    console.error('Error applying migration:', err)
    process.exit(1)
  }
}

// Try the direct method first
console.log('Starting portfolio history migration...')
applyMigrationDirect()
  .then(() => {
    console.log('Portfolio history migration finished')
    process.exit(0)
  })
  .catch(err => {
    console.error('Migration failed:', err)
    process.exit(1)
  }) 