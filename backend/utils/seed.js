'use strict';

/**
 * Database Seeder — Jimo East Portal
 *
 * Usage:
 *   node utils/seed.js            → seeds the database
 *   node utils/seed.js --destroy  → wipes all collections
 *
 * WARNING: Only run in development. Never run --destroy in production.
 */

require('dotenv').config();

const mongoose       = require('mongoose');
const User           = require('../models/User');
const ServiceRequest = require('../models/ServiceRequest');
const Dispute        = require('../models/Dispute');
const SecurityReport = require('../models/SecurityReport');
const IllicitReport  = require('../models/IllicitReport');
const Announcement   = require('../models/Announcement');
const logger         = require('./logger');

const VILLAGES = [
  'Kowala','Kabuor Saye','Kabuor Achego','Kagure Lower','Kamula','Koloo',
  'Kasaye West','Kasaye Central','Kabura','Kamwana A','Kamwana B','Kochuka',
  'Kagaya','Kouko Oola','Kagure Upper','Kakelo','Kasaye Cherwa','Kanjira',
  'Kogol','Kabuor Omuga',
];

// ─── Seed Data ────────────────────────────────────────────────────────────────

const ADMIN_USER = {
  name:      'Chief John Otieno',
  id_number: '10000001',
  phone:     '0726299887',
  village:   'Kasaye Central',
  role:      'chief',
  password:  'OtienoJohn@2026',
  verified:  true,
  verified_at: new Date(),
};

const ASST_ADMIN = {
  name:      'Chief Lukas Omollo',
  id_number: '10000002',
  phone:     '0700000002',
  village:   'Kagaya',
  role:      'assistant_chief',
  password:  'OmoloLukas@2026',
  verified:  true,
  verified_at: new Date(),
};

const TEST_CITIZENS = [
  { name:'Mary Achieng',   id_number:'12345678', phone:'0712345678', village:'Kowala',       password:'Test@1234', verified:true, verified_at:new Date() },
  { name:'Peter Odhiambo', id_number:'23456789', phone:'0723456789', village:'Kamula',       password:'Test@1234', verified:true, verified_at:new Date() },
  { name:'Grace Atieno',   id_number:'34567890', phone:'0734567890', village:'Kochuka',      password:'Test@1234', verified:true, verified_at:new Date() },
  { name:'James Otieno',   id_number:'45678901', phone:'0745678901', village:'Kagaya',       password:'Test@1234', verified:true, verified_at:new Date() },
  { name:'Ann Moraa',      id_number:'56789012', phone:'0756789012', village:'Kabura',       password:'Test@1234', verified:true, verified_at:new Date() },
  { name:'Joseph Kamau',   id_number:'67890123', phone:'0767890123', village:'Koloo',        password:'Test@1234', verified:true, verified_at:new Date() },
  { name:'Faith Wanjiku',  id_number:'78901234', phone:'0778901234', village:'Kasaye West',  password:'Test@1234', verified:true, verified_at:new Date() },
  { name:'David Ochieng',  id_number:'89012345', phone:'0789012345', village:'Kagure Lower', password:'Test@1234', verified:true, verified_at:new Date() },
];

const ANNOUNCEMENTS = [
  {
    title:    'Public Baraza — Friday 14 March 2025',
    body:     'The Chief invites all residents to attend the public baraza at Jimo East DO grounds. Agenda: land adjudication updates and community policing strategies.',
    category: 'baraza',
    target_villages: ['all'],
    is_pinned: true,
  },
  {
    title:    'Vaccination Drive — Measles & Polio',
    body:     'Free immunisation for children under 5 at Jimo Health Centre. Bring your child health card. Sessions run Monday to Friday, 8am–4pm.',
    category: 'health',
    target_villages: ['all'],
  },
  {
    title:    'Huduma Namba Registration',
    body:     'Mobile registration unit will visit selected villages next week. Carry your original National ID card and any supporting documents.',
    category: 'government',
    target_villages: ['Kowala', 'Kabuor Saye', 'Kamula'],
  },
  {
    title:    'Road Grading — Kochuka–Koloo Road',
    body:     'KeRRA will commence grading works on the Kochuka–Koloo road. Expect traffic disruption for approximately 3 days.',
    category: 'development',
    target_villages: ['Kochuka', 'Koloo', 'Kogol'],
  },
  {
    title:    '⚠ Security Alert — Night Patrols Increased',
    body:     'Following recent incidents in the location, security patrols have been intensified. Residents are urged to report any suspicious activity immediately using this portal or by calling 999.',
    category: 'security',
    target_villages: ['all'],
    is_pinned: true,
  },
];

// ─── Seed function ────────────────────────────────────────────────────────────
const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB for seeding...');

    // Create admin & assistant
    const adminUser = await User.create(ADMIN_USER);
    const asstUser  = await User.create(ASST_ADMIN);
    logger.info(`✅ Admin created: ${adminUser.phone} / OtienoJohn@2026`);
    logger.info(`✅ Asst Chief created: ${asstUser.phone} / OmoloLukas@2026`);

    // Create test citizens
    const citizens = await User.create(TEST_CITIZENS);
    logger.info(`✅ ${citizens.length} test citizens created`);

    // Create announcements
    const anns = await Announcement.create(
      ANNOUNCEMENTS.map((a) => ({
        ...a,
        published_by:      adminUser._id,
        published_by_name: adminUser.name,
      }))
    );
    logger.info(`✅ ${anns.length} announcements created`);

    // Create sample service requests
    const [mary, peter, grace, james, ann] = citizens;

    const requests = await ServiceRequest.create([
      {
        ref_number:       'JE-2025-001',
        letter_type:      'residence',
        citizen_uid:      mary._id,
        citizen_name:     mary.name,
        village:          mary.village,
        purpose:          'For submission to Huduma Centre for address confirmation',
        status:           'approved',
        approved_by:      adminUser._id,
        approved_at:      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        letter_pdf_url:   '/uploads/letters/JE-2025-001.pdf',
        sms_sent_approval: true,
      },
      {
        ref_number:   'JE-2025-004',
        letter_type:  'conduct',
        citizen_uid:  grace._id,
        citizen_name: grace.name,
        village:      grace.village,
        purpose:      'For job application at Kisumu County Government',
        destination:  'Kisumu County Government HR Department',
        status:       'approved',
        approved_by:  adminUser._id,
        approved_at:  new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        letter_pdf_url: '/uploads/letters/JE-2025-004.pdf',
        sms_sent_approval: true,
      },
      {
        ref_number:   'JE-2025-006',
        letter_type:  'id_letter',
        citizen_uid:  james._id,
        citizen_name: james.name,
        village:      james.village,
        purpose:      'For National ID replacement after loss',
        status:       'rejected',
        rejection_reason: 'Insufficient supporting documentation. Please reapply with a police abstract.',
        reviewed_by:  adminUser._id,
        reviewed_at:  new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        ref_number:   'JE-2025-007',
        letter_type:  'school',
        citizen_uid:  ann._id,
        citizen_name: ann.name,
        village:      ann.village,
        purpose:      'For admission to Jimo Primary School — Standard One',
        destination:  'Jimo Primary School',
        status:       'under_review',
        reviewed_by:  adminUser._id,
        reviewed_at:  new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        ref_number:   'JE-2025-008',
        letter_type:  'intro_id',
        citizen_uid:  peter._id,
        citizen_name: peter.name,
        village:      peter.village,
        purpose:      'Applying for National ID for the first time',
        status:       'submitted',
      },
    ]);
    logger.info(`✅ ${requests.length} service requests created`);

    // Sample disputes
    const disputes = await Dispute.create([
      {
        ref_number:     'JE-D-1001',
        type:           'Land Boundary',
        parties:        'John Otieno vs Peter Ochieng',
        description:    'Dispute over the boundary of Plot No. 234 near Kabuor river. The complainant alleges encroachment of approximately 3 metres.',
        village:        'Kamula',
        location_description: 'North boundary of Plot 234, near Kabuor river bridge',
        complainant_uid:  peter._id,
        complainant_name: peter.name,
        status:         'hearing_scheduled',
        hearing_date:   new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        hearing_venue:  'Jimo East DO Grounds',
      },
      {
        ref_number:  'JE-D-1002',
        type:        'Inheritance',
        parties:     'Achieng Family — 4 siblings',
        description: 'Dispute over distribution of the late Mzee Achieng\'s land parcel among four children. Eldest son claims sole ownership.',
        village:     'Kowala',
        complainant_uid:  mary._id,
        complainant_name: mary.name,
        status:      'under_review',
      },
    ]);
    logger.info(`✅ ${disputes.length} disputes created`);

    // Sample security reports
    const secReports = await SecurityReport.create([
      {
        ref_number:  'JE-S-4001',
        type:        'Theft',
        urgency:     'high',
        description: 'Three goats stolen from Kamau homestead overnight. Suspects believed to have fled towards Koloo direction.',
        village:     'Koloo',
        anonymous:   true,
        status:      'under_review',
      },
      {
        ref_number:  'JE-S-4002',
        type:        'Suspicious Activity',
        urgency:     'medium',
        description: 'Unknown persons spotted near Jimo East Primary School after 9pm on two consecutive nights. No identification possible.',
        village:     'Kasaye West',
        anonymous:   true,
        status:      'submitted',
      },
    ]);
    logger.info(`✅ ${secReports.length} security reports created`);

    // Sample illicit report
    await IllicitReport.create({
      ref_number:  'JE-I-7001',
      type:        'Illicit Alcohol Brewing',
      description: 'Chang\'aa brewing operation suspected in the bushy area near the river, operating mainly at night.',
      village:     'Kagure Lower',
      status:      'investigating',
    });
    logger.info('✅ 1 illicit report created');

    console.log('\n══════════════════════════════════════════════════');
    console.log('  ✅  DATABASE SEEDED SUCCESSFULLY');
    console.log('══════════════════════════════════════════════════');
    console.log('\n  ADMIN LOGIN:');
    console.log('  Phone:    0726299887');
    console.log('  Password: OtienoJohn@2026');
    console.log('\n  TEST CITIZEN LOGIN:');
    console.log('  Phone:    0712345678');
    console.log('  Password: Test@1234');
    console.log('\n  API Docs: http://localhost:5000/api/docs');
    console.log('══════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    logger.error('Seed failed:', err);
    process.exit(1);
  }
};

// ─── Destroy function ─────────────────────────────────────────────────────────
const destroyDB = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌  REFUSED: Cannot run --destroy in production.');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Promise.all([
      User.deleteMany(),
      ServiceRequest.deleteMany(),
      Dispute.deleteMany(),
      SecurityReport.deleteMany(),
      IllicitReport.deleteMany(),
      Announcement.deleteMany(),
    ]);
    logger.info('🗑  All collections wiped.');
    process.exit(0);
  } catch (err) {
    logger.error('Destroy failed:', err);
    process.exit(1);
  }
};

// ─── Entry point ──────────────────────────────────────────────────────────────
if (process.argv.includes('--destroy')) {
  destroyDB();
} else {
  seedDB();
}
