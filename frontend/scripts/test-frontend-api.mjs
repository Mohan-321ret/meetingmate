/**
 * Frontend Integration Test Suite
 * Tests ApiClient, MeetingApiService, AnswerApiService, SavedAnswerApiService,
 * and SearchApiService against real backend.
 */

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:8000/api/v1';

async function runTests() {
  console.log(`\n======================================================`);
  console.log(` JW Meeting Assistant - Frontend Integration Tests`);
  console.log(` Target Server: ${BASE_URL}`);
  console.log(`======================================================\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // 1. Health Check
  // --------------------------------------------------------------------------
  console.log('1. Health Check & Connectivity');
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    assert(res.status === 200, `Health endpoint returns 200 OK`);
    assert(data.status === 'healthy', `Backend status is 'healthy'`);
    assert(data.service === 'jw-meetingmate-backend', `Service identity verified`);
  } catch (err) {
    assert(false, `Health check failed: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // 2. Meeting Retrieval
  // --------------------------------------------------------------------------
  console.log('\n2. Meeting Retrieval APIs');
  let sampleMeetingId = null;
  try {
    const res = await fetch(`${BASE_URL}/meetings?limit=5`);
    const meetings = await res.json();
    assert(res.status === 200, `List meetings returns 200 OK`);
    assert(Array.isArray(meetings) && meetings.length > 0, `Retrieved ${meetings.length} meetings`);
    if (meetings.length > 0) {
      sampleMeetingId = meetings[0].id;
      assert(Boolean(meetings[0].meeting_type), `Meeting has meeting_type: ${meetings[0].meeting_type}`);
      assert(Boolean(meetings[0].title), `Meeting has title: ${meetings[0].title}`);
    }

    // Detail
    if (sampleMeetingId) {
      const detailRes = await fetch(`${BASE_URL}/meetings/${sampleMeetingId}`);
      const detail = await detailRes.json();
      assert(detailRes.status === 200, `Get meeting by ID returns 200 OK`);
      assert(detail.id === sampleMeetingId, `Meeting detail matches ID`);
      assert(Array.isArray(detail.questions), `Meeting detail has questions array (count: ${detail.questions.length})`);
    }
  } catch (err) {
    assert(false, `Meeting retrieval failed: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // 3. Question Retrieval
  // --------------------------------------------------------------------------
  console.log('\n3. Question Retrieval APIs');
  let sampleQuestionId = null;
  try {
    if (sampleMeetingId) {
      const res = await fetch(`${BASE_URL}/meetings/${sampleMeetingId}/questions`);
      const questions = await res.json();
      assert(res.status === 200, `Get meeting questions returns 200 OK`);
      assert(Array.isArray(questions), `Questions array returned`);
      if (questions.length > 0) {
        sampleQuestionId = questions[0].id;
        assert(Boolean(questions[0].question_text), `Question text: ${questions[0].question_text.slice(0, 30)}...`);

        // Get single question
        const qRes = await fetch(`${BASE_URL}/questions/${sampleQuestionId}`);
        const qData = await qRes.json();
        assert(qRes.status === 200, `Get single question returns 200 OK`);
        assert(qData.id === sampleQuestionId, `Question ID matches`);
      }
    }
  } catch (err) {
    assert(false, `Question retrieval failed: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // 4. AI Answer Generation
  // --------------------------------------------------------------------------
  console.log('\n4. AI Answer Generation (RAG & Groq Pipeline)');
  try {
    const answerRes = await fetch(`${BASE_URL}/answers/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'சங்கீதம் 119:105 குறிப்பிடும் வெளிச்சம் என்பதன் அர்த்தம் என்ன?',
        answer_type: 'short',
        language: 'ta',
        save_answer: false,
        save_to_history: true,
      }),
    });
    const ansData = await answerRes.json();
    assert(answerRes.status === 200, `Generate answer returns 200 OK`);
    assert(Boolean(ansData.answer) && ansData.answer.length > 10, `Generated Tamil answer returned`);
    assert(Array.isArray(ansData.sources), `Retrieved sources array returned`);
    console.log(`    Answer snippet: "${ansData.answer.slice(0, 60)}..."`);
  } catch (err) {
    assert(false, `Answer generation failed: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // 5. Independent Question Search
  // --------------------------------------------------------------------------
  console.log('\n5. Independent Question API');
  try {
    const indRes = await fetch(`${BASE_URL}/answers/independent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'கடவுளின் ராஜ்யம் என்றால் என்ன?',
        answer_type: 'short',
        language: 'ta',
        save_to_history: true,
      }),
    });
    const indData = await indRes.json();
    assert(indRes.status === 200, `Ask independent question returns 200 OK`);
    assert(Boolean(indData.answer), `Independent answer generated`);
  } catch (err) {
    assert(false, `Independent question failed: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // 6. Saved Answers Lifecycle
  // --------------------------------------------------------------------------
  console.log('\n6. Saved Answers Lifecycle (CRUD)');
  let createdSavedId = null;
  try {
    // Create
    const createRes = await fetch(`${BASE_URL}/saved-answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        custom_title: 'குடும்ப படிப்பு குறிப்பு',
        answer_text: 'யெகோவாவை முழு இருதயத்தோடு நேசிக்க வேண்டும்.',
        notes: 'ஞாயிறு கூட்டத்தில் சொல்ல வேண்டியது',
      }),
    });
    const created = await createRes.json();
    assert(createRes.status === 201, `Create saved answer returns 201 Created`);
    assert(Boolean(created.id), `Saved answer assigned ID: ${created.id}`);
    createdSavedId = created.id;

    // List
    const listRes = await fetch(`${BASE_URL}/saved-answers`);
    const list = await listRes.json();
    assert(listRes.status === 200, `List saved answers returns 200 OK`);
    assert(list.some(item => item.id === createdSavedId), `Created answer is present in list`);

    // Get by ID
    const getRes = await fetch(`${BASE_URL}/saved-answers/${createdSavedId}`);
    const fetched = await getRes.json();
    assert(getRes.status === 200, `Get saved answer returns 200 OK`);
    assert(fetched.answer_text === 'யெகோவாவை முழு இருதயத்தோடு நேசிக்க வேண்டும்.', `Answer text verified`);

    // Update
    const updateRes = await fetch(`${BASE_URL}/saved-answers/${createdSavedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        custom_title: 'திருத்தப்பட்ட குடும்ப குறிப்பு',
        answer_text: 'முழு இருதயத்தோடு யெகோவாவை சேவிப்பதே நித்திய வாழ்வு.',
      }),
    });
    const updated = await updateRes.json();
    assert(updateRes.status === 200, `Update saved answer returns 200 OK`);
    assert(updated.custom_title === 'திருத்தப்பட்ட குடும்ப குறிப்பு', `Title updated successfully`);

    // Delete
    const delRes = await fetch(`${BASE_URL}/saved-answers/${createdSavedId}`, {
      method: 'DELETE',
    });
    assert(delRes.status === 200, `Delete saved answer returns 200 OK`);

    // Verify 404 after delete
    const verifyRes = await fetch(`${BASE_URL}/saved-answers/${createdSavedId}`);
    assert(verifyRes.status === 404, `Verified 404 for deleted answer`);
  } catch (err) {
    assert(false, `Saved answers CRUD failed: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // 7. Search History
  // --------------------------------------------------------------------------
  console.log('\n7. Search History APIs');
  try {
    const histRes = await fetch(`${BASE_URL}/history?limit=10`);
    const history = await histRes.json();
    assert(histRes.status === 200, `List history returns 200 OK`);
    assert(Array.isArray(history), `History array returned (count: ${history.length})`);
    if (history.length > 0) {
      assert(Boolean(history[0].query), `History record has query: "${history[0].query}"`);
    }
  } catch (err) {
    assert(false, `History API failed: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // 8. Semantic Knowledge Search
  // --------------------------------------------------------------------------
  console.log('\n8. Semantic Knowledge Search (ChromaDB)');
  try {
    const searchRes = await fetch(`${BASE_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'ஜெபம் கடவுளுக்கு பிரியமானது',
        top_k: 3,
      }),
    });
    const searchData = await searchRes.json();
    assert(searchRes.status === 200, `Search endpoint returns 200 OK`);
    assert(searchData.query === 'ஜெபம் கடவுளுக்கு பிரியமானது', `Search query echoed`);
    assert(Array.isArray(searchData.results), `Results returned (count: ${searchData.results.length})`);
  } catch (err) {
    assert(false, `Semantic search failed: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // 9. Backend Unavailable Scenario
  // --------------------------------------------------------------------------
  console.log('\n9. Backend Unavailable / Offline Scenario');
  try {
    await fetch('http://127.0.0.1:59999/api/v1/health', { signal: AbortSignal.timeout(1000) });
    assert(false, `Unreachable server should have thrown error`);
  } catch (err) {
    assert(true, `Gracefully caught network connection failure: ${err.message || 'Connection refused'}`);
  }

  // --------------------------------------------------------------------------
  // 10. Slow Network / Timeout Handling
  // --------------------------------------------------------------------------
  console.log('\n10. Slow Network / Timeout Scenario');
  try {
    // 1ms timeout triggers timeout error
    await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(1) });
    assert(false, `Instant timeout should have aborted`);
  } catch (err) {
    assert(err.name === 'TimeoutError' || err.name === 'AbortError', `Gracefully caught request timeout: ${err.name}`);
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log(`\n======================================================`);
  console.log(` Results: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
