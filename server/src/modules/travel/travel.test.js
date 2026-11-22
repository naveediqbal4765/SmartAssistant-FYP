/**
 * Travel Journey Module - Integration Tests
 * 
 * Run: node src/modules/travel/travel.test.js
 * Requires: MongoDB running on localhost:27017
 */

// Set environment variables BEFORE any requires
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smart-senior-secret-2026';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret';
process.env.FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID || 'test-facebook-client-id';
process.env.FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET || 'test-facebook-client-secret';
process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'test';
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'test';
process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'test';

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const express = require('express');
const TravelJourney = require('./models/TravelJourney');
const User = require('../../../models/User');
const travelRoutes = require('./travel.routes');

const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-senior-db';
const PORT = 5099;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Test data
const TEST_PREFIX = 'travel_test_';
let server;
let seniorToken, seniorId;
let linkedCaregiverToken, linkedCaregiverId;
let unlinkedCaregiverToken, unlinkedCaregiverId;
let createdJourneyIds = [];

// ── HTTP Helper ──────────────────────────────────────────────────────────────

const request = (method, path, body, token) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

// ── Test Helpers ─────────────────────────────────────────────────────────────

const validPickup = {
  address: '123 Main St, Test City',
  coordinates: [-74.006, 40.7128]
};

const validDestination = {
  address: '456 Oak Ave, Test City',
  coordinates: [-73.9352, 40.7306]
};

const validRoute = {
  geometry: {
    coordinates: [
      [-74.006, 40.7128],
      [-74.000, 40.7200],
      [-73.950, 40.7250],
      [-73.9352, 40.7306]
    ]
  },
  distanceMeters: 5000,
  estimatedDurationSeconds: 900
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
};

// Helper: cancel/complete all active journeys for the test senior
const ensureNoActiveJourney = async () => {
  const active = await TravelJourney.find({ seniorId: seniorId, status: 'active' });
  for (const j of active) {
    await TravelJourney.findByIdAndUpdate(j._id, { status: 'cancelled', completedAt: new Date() });
  }
};

// ── Setup ────────────────────────────────────────────────────────────────────

const setup = async () => {
  console.log('\n📋 Setting up test data...\n');

  // Clean up any leftover test data
  await User.deleteMany({ email: { $regex: `^${TEST_PREFIX}` } });
  await TravelJourney.deleteMany({});

  // Create senior
  const senior = await User.create({
    name: 'Test Senior',
    email: `${TEST_PREFIX}senior@test.com`,
    password: 'hashedpassword',
    role: 'elder',
    isVerified: true
  });
  seniorId = senior._id;
  seniorToken = jwt.sign({ userId: senior._id }, JWT_SECRET);

  // Create linked caregiver
  const linkedCaregiver = await User.create({
    name: 'Linked Caregiver',
    email: `${TEST_PREFIX}linked_cg@test.com`,
    password: 'hashedpassword',
    role: 'caregiver',
    isVerified: true,
    linkedSeniorId: senior._id
  });
  linkedCaregiverId = linkedCaregiver._id;
  linkedCaregiverToken = jwt.sign({ userId: linkedCaregiver._id }, JWT_SECRET);

  // Update senior with linked caregiver
  senior.linkedCaregivers = [linkedCaregiver._id];
  await senior.save();

  // Verify the link was saved
  const verifyCaregiver = await User.findById(linkedCaregiver._id);
  assert(
    verifyCaregiver.linkedSeniorId && verifyCaregiver.linkedSeniorId.toString() === senior._id.toString(),
    'Caregiver linkedSeniorId not saved correctly'
  );

  // Create unlinked caregiver
  const unlinkedCaregiver = await User.create({
    name: 'Unlinked Caregiver',
    email: `${TEST_PREFIX}unlinked_cg@test.com`,
    password: 'hashedpassword',
    role: 'caregiver',
    isVerified: true
  });
  unlinkedCaregiverId = unlinkedCaregiver._id;
  unlinkedCaregiverToken = jwt.sign({ userId: unlinkedCaregiver._id }, JWT_SECRET);

  console.log('✅ Test users created\n');
};

// ── Cleanup ──────────────────────────────────────────────────────────────────

const cleanup = async () => {
  console.log('\n📋 Cleaning up test data...\n');
  await User.deleteMany({ email: { $regex: `^${TEST_PREFIX}` } });
  await TravelJourney.deleteMany({});
  console.log('✅ Cleanup complete\n');
};

// ── Test Scenarios ───────────────────────────────────────────────────────────

const results = [];

const runTest = async (name, fn) => {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
    console.log(`✅ PASS: ${name}`);
  } catch (err) {
    results.push({ name, status: 'FAIL', error: err.message });
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${err.message}`);
  }
};

// Scenario 1: Senior can create a journey with valid GeoJSON route data
const test1_CreateJourney = async () => {
  const res = await request('POST', '/api/travel', {
    pickup: validPickup,
    destination: validDestination,
    route: validRoute,
    caregiverLocationConsent: true
  }, seniorToken);

  assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert(res.body.success === true, 'Expected success: true');
  assert(res.body.journey, 'Expected journey in response');
  createdJourneyIds.push(res.body.journey._id);
};

// Scenario 2: New journey is saved as planned; no location tracking starts
const test2_PlannedStatus = async () => {
  const journey = await TravelJourney.findById(createdJourneyIds[0]);
  assert(journey.status === 'planned', `Expected status 'planned', got '${journey.status}'`);
  assert(
    journey.currentLocation.coordinates === null ||
    (Array.isArray(journey.currentLocation.coordinates) && journey.currentLocation.coordinates.length === 0) ||
    journey.lastLocationUpdateAt === null,
    'Location tracking should not start at creation'
  );
};

// Scenario 3: Senior can start a planned journey
const test3_StartJourney = async () => {
  const res = await request('POST', `/api/travel/${createdJourneyIds[0]}/start`, {
    currentLocation: [-74.006, 40.7128]
  }, seniorToken);

  assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert(res.body.journey.status === 'active', 'Expected status to be active');
  assert(res.body.journey.startedAt, 'Expected startedAt to be set');
};

// Scenario 4: Senior cannot start a second journey while another is active
const test4_NoSecondActive = async () => {
  const createRes = await request('POST', '/api/travel', {
    pickup: validPickup,
    destination: validDestination,
    route: validRoute
  }, seniorToken);
  createdJourneyIds.push(createRes.body.journey._id);

  const res = await request('POST', `/api/travel/${createRes.body.journey._id}/start`, {}, seniorToken);

  assert(res.status === 409, `Expected 409, got ${res.status}`);
  assert(res.body.msg.includes('active journey'), 'Expected message about active journey');
};

// Scenario 5: Concurrent requests - one-active-journey guarantee
const test5_ConcurrentStart = async () => {
  // Ensure clean state: no active journeys
  await ensureNoActiveJourney();

  // Create two new planned journeys
  const [j1, j2] = await Promise.all([
    request('POST', '/api/travel', {
      pickup: validPickup,
      destination: validDestination,
      route: validRoute
    }, seniorToken),
    request('POST', '/api/travel', {
      pickup: validPickup,
      destination: validDestination,
      route: validRoute
    }, seniorToken)
  ]);
  createdJourneyIds.push(j1.body.journey._id, j2.body.journey._id);

  // Attempt to start both concurrently
  const [r1, r2] = await Promise.all([
    request('POST', `/api/travel/${j1.body.journey._id}/start`, {}, seniorToken),
    request('POST', `/api/travel/${j2.body.journey._id}/start`, {}, seniorToken)
  ]);

  // Exactly one should succeed, one should fail with 409
  const successCount = [r1, r2].filter(r => r.status === 200).length;
  const conflictCount = [r1, r2].filter(r => r.status === 409).length;

  assert(successCount === 1, `Expected exactly 1 success, got ${successCount} (r1=${r1.status}, r2=${r2.status})`);
  assert(conflictCount === 1, `Expected exactly 1 conflict (409), got ${conflictCount}`);

  // Verify only one active journey exists
  const activeCount = await TravelJourney.countDocuments({
    seniorId: seniorId,
    status: 'active'
  });
  assert(activeCount === 1, `Expected 1 active journey, found ${activeCount}`);
};

// Scenario 6: Location updates work only for active journey
const test6_LocationUpdate = async () => {
  const activeJourney = await TravelJourney.findOne({ seniorId: seniorId, status: 'active' });
  assert(activeJourney, 'Expected an active journey to exist');

  const res = await request('PATCH', `/api/travel/${activeJourney._id}/location`, {
    coordinates: [-73.980, 40.7250]
  }, seniorToken);

  assert(res.status === 200, `Expected 200, got ${res.status}`);
  assert(res.body.journey.currentLocation.coordinates[0] === -73.980, 'Location not updated');
  assert(res.body.journey.lastLocationUpdateAt, 'lastLocationUpdateAt not set');

  // Try to update location on a completed journey
  const completedJourney = await TravelJourney.findOne({ seniorId: seniorId, status: 'completed' });
  if (completedJourney) {
    const res2 = await request('PATCH', `/api/travel/${completedJourney._id}/location`, {
      coordinates: [-73.980, 40.7250]
    }, seniorToken);
    assert(res2.status === 409, `Expected 409 for completed journey, got ${res2.status}`);
  }
};

// Scenario 7: Complete and cancel journeys
const test7_CompleteAndCancel = async () => {
  let activeJourney = await TravelJourney.findOne({ seniorId: seniorId, status: 'active' });
  assert(activeJourney, 'Expected an active journey to exist');

  const completeRes = await request('POST', `/api/travel/${activeJourney._id}/complete`, {}, seniorToken);
  assert(completeRes.status === 200, `Complete: Expected 200, got ${completeRes.status}`);
  assert(completeRes.body.journey.status === 'completed', 'Status should be completed');
  assert(completeRes.body.journey.completedAt, 'completedAt should be set');

  // Try to complete again (should fail)
  const completeAgain = await request('POST', `/api/travel/${activeJourney._id}/complete`, {}, seniorToken);
  assert(completeAgain.status === 409, `Expected 409 for re-complete, got ${completeAgain.status}`);

  // Create a new journey and cancel it
  const newJourney = await request('POST', '/api/travel', {
    pickup: validPickup,
    destination: validDestination,
    route: validRoute
  }, seniorToken);
  createdJourneyIds.push(newJourney.body.journey._id);

  const cancelRes = await request('POST', `/api/travel/${newJourney.body.journey._id}/cancel`, {}, seniorToken);
  assert(cancelRes.status === 200, `Cancel: Expected 200, got ${cancelRes.status}`);
  assert(cancelRes.body.journey.status === 'cancelled', 'Status should be cancelled');

  // Try to cancel again (should fail)
  const cancelAgain = await request('POST', `/api/travel/${newJourney.body.journey._id}/cancel`, {}, seniorToken);
  assert(cancelAgain.status === 409, `Expected 409 for re-cancel, got ${cancelAgain.status}`);
};

// Scenario 8: Unlinked caregivers cannot access journey details
const test8_UnlinkedCaregiver = async () => {
  const journey = await TravelJourney.findOne({ seniorId: seniorId });
  assert(journey, 'Expected at least one journey to exist');

  const res = await request('GET', `/api/travel/${journey._id}`, null, unlinkedCaregiverToken);
  assert(res.status === 403, `Expected 403, got ${res.status}`);
};

// Scenario 9: Linked caregivers cannot access without consent or when not active
const test9_LinkedCaregiverRestrictions = async () => {
  // Ensure clean state
  await ensureNoActiveJourney();

  // Create journey without consent
  const noConsentJourney = await request('POST', '/api/travel', {
    pickup: validPickup,
    destination: validDestination,
    route: validRoute,
    caregiverLocationConsent: false
  }, seniorToken);
  createdJourneyIds.push(noConsentJourney.body.journey._id);

  // Start it
  const startRes = await request('POST', `/api/travel/${noConsentJourney.body.journey._id}/start`, {}, seniorToken);
  assert(startRes.status === 200, `Start no-consent journey: Expected 200, got ${startRes.status}: ${JSON.stringify(startRes.body)}`);

  // Caregiver tries to access (should fail - no consent)
  const res1 = await request('GET', `/api/travel/${noConsentJourney.body.journey._id}`, null, linkedCaregiverToken);
  assert(res1.status === 403, `Expected 403 for no consent, got ${res1.status}`);
  assert(
    res1.body.msg.includes('consent'),
    `Expected consent-related error message, got: "${res1.body.msg}"`
  );

  // Complete it
  const completeRes = await request('POST', `/api/travel/${noConsentJourney.body.journey._id}/complete`, {}, seniorToken);
  assert(completeRes.status === 200, `Complete no-consent journey: Expected 200, got ${completeRes.status}`);

  // Create journey with consent but don't start it (planned status)
  const plannedJourney = await request('POST', '/api/travel', {
    pickup: validPickup,
    destination: validDestination,
    route: validRoute,
    caregiverLocationConsent: true
  }, seniorToken);
  createdJourneyIds.push(plannedJourney.body.journey._id);

  // Caregiver tries to access planned journey (should fail - not active)
  const res2 = await request('GET', `/api/travel/${plannedJourney.body.journey._id}`, null, linkedCaregiverToken);
  assert(res2.status === 403, `Expected 403 for planned journey, got ${res2.status}`);
  assert(
    res2.body.msg.includes('active'),
    `Expected active-related error message, got: "${res2.body.msg}"`
  );
};

// Scenario 10: Linked caregivers can access active journey with consent
const test10_LinkedCaregiverAccess = async () => {
  // Ensure clean state
  await ensureNoActiveJourney();

  // Create journey with consent
  const journey = await request('POST', '/api/travel', {
    pickup: validPickup,
    destination: validDestination,
    route: validRoute,
    caregiverLocationConsent: true
  }, seniorToken);
  createdJourneyIds.push(journey.body.journey._id);

  // Start it
  const startRes = await request('POST', `/api/travel/${journey.body.journey._id}/start`, {
    currentLocation: [-74.006, 40.7128]
  }, seniorToken);
  assert(startRes.status === 200, `Start journey: Expected 200, got ${startRes.status}: ${JSON.stringify(startRes.body)}`);

  // Caregiver accesses (should succeed)
  const res = await request('GET', `/api/travel/${journey.body.journey._id}`, null, linkedCaregiverToken);
  assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert(res.body.journey, 'Expected journey in response');
  assert(res.body.journey.route, 'Expected route data');
  assert(res.body.journey.currentLocation, 'Expected current location');
};

// Scenario 11: Invalid data rejection
const test11_InvalidData = async () => {
  // Invalid coordinates (out of range)
  const res1 = await request('POST', '/api/travel', {
    pickup: { address: 'Test', coordinates: [200, 100] },
    destination: validDestination,
    route: validRoute
  }, seniorToken);
  assert(res1.status === 400, `Invalid coords: Expected 400, got ${res1.status}`);

  // Invalid route geometry (less than 2 points)
  const res2 = await request('POST', '/api/travel', {
    pickup: validPickup,
    destination: validDestination,
    route: {
      geometry: { coordinates: [[-74.006, 40.7128]] },
      distanceMeters: 100,
      estimatedDurationSeconds: 60
    }
  }, seniorToken);
  assert(res2.status === 400, `Invalid geometry: Expected 400, got ${res2.status}`);

  // Missing required fields
  const res3 = await request('POST', '/api/travel', {
    pickup: validPickup
  }, seniorToken);
  assert(res3.status === 400, `Missing fields: Expected 400, got ${res3.status}`);

  // Invalid journey ID
  const res4 = await request('GET', '/api/travel/invalid-id', null, seniorToken);
  assert(res4.status === 400, `Invalid ID: Expected 400, got ${res4.status}`);

  // Non-existent journey ID
  const fakeId = new mongoose.Types.ObjectId();
  const res5 = await request('GET', `/api/travel/${fakeId}`, null, seniorToken);
  assert(res5.status === 404, `Non-existent ID: Expected 404, got ${res5.status}`);

  // Invalid location update coordinates
  const activeJourney = await TravelJourney.findOne({ seniorId: seniorId, status: 'active' });
  if (activeJourney) {
    const res6 = await request('PATCH', `/api/travel/${activeJourney._id}/location`, {
      coordinates: [999, 999]
    }, seniorToken);
    assert(res6.status === 400, `Invalid update coords: Expected 400, got ${res6.status}`);
  }
};

// ── Main ─────────────────────────────────────────────────────────────────────

const main = async () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Travel Journey Module - Integration Tests');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Connect to database
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Ensure indexes are created (including partial unique index)
    await TravelJourney.syncIndexes();
    console.log('✅ Indexes synced\n');

    // Create minimal Express app for testing
    const app = express();
    app.use(express.json());
    app.use('/api/travel', travelRoutes);
    server = app.listen(PORT);
    console.log(`✅ Test server started on port ${PORT}\n`);

    // Setup test data
    await setup();

    // Run all tests
    await runTest('1. Senior can create journey with valid GeoJSON', test1_CreateJourney);
    await runTest('2. New journey is planned; no location tracking', test2_PlannedStatus);
    await runTest('3. Senior can start a planned journey', test3_StartJourney);
    await runTest('4. Senior cannot start second journey while active', test4_NoSecondActive);
    await runTest('5. Concurrent start requests - one-active guarantee', test5_ConcurrentStart);
    await runTest('6. Location updates work only for active journey', test6_LocationUpdate);
    await runTest('7. Complete and cancel journeys with status transitions', test7_CompleteAndCancel);
    await runTest('8. Unlinked caregivers cannot access journey', test8_UnlinkedCaregiver);
    await runTest('9. Linked caregivers restricted without consent/not active', test9_LinkedCaregiverRestrictions);
    await runTest('10. Linked caregivers can access active journey with consent', test10_LinkedCaregiverAccess);
    await runTest('11. Invalid data is rejected', test11_InvalidData);

    // Cleanup
    await cleanup();

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   Test Summary');
    console.log('═══════════════════════════════════════════════════════════\n');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    results.forEach(r => {
      console.log(`${r.status === 'PASS' ? '✅' : '❌'} ${r.name}`);
      if (r.error) console.log(`   └─ ${r.error}`);
    });

    console.log(`\n───────────────────────────────────────────────────────────`);
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`───────────────────────────────────────────────────────────\n`);

  } catch (err) {
    console.error('Test suite error:', err);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
    process.exit(results.some(r => r.status === 'FAIL') ? 1 : 0);
  }
};

main();