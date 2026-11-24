const REG_SHEET_ID = '1OlbUc33Wf2Cs_ZUs6WneCjv3eeZ1XL5cmyJ9IkzZUto';
const REG_FORM_ID = '1wBwsA9ZTMQt19oQ9lnJzwlitFYMGf3EW6h9PqGvsU0s';
const REG_CHOICE = 'I confirm that I have read and understood the crew rules, and that the information submitted for my team is accurate.';
const REG_TITLES = {
  team: '1. Team Name',
  'm1-name': '2. Team Leader — Full Name',
  'm1-phone': '3. Team Leader — WhatsApp Number',
  'm1-email': '4. Team Leader — Email Address',
  college: '5. Team Leader — College',
  department: '6. Team Leader — Department',
  year: '7. Team Leader — Year of Study',
  'm2-name': '8. Member 2 — Full Name',
  'm2-phone': '9. Member 2 — Phone Number',
  'm2-email': '10. Member 2 — Email Address',
  'm3-name': '11. Member 3 — Full Name',
  'm3-phone': '12. Member 3 — Phone Number',
  'm3-email': '13. Member 3 — Email Address',
  confirm: '14. Confirmation — I have read the crew rules',
};

function regJson_(result) {
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function regError_(code, message) {
  return {ok: false, code, message};
}

function regValidate_(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      Object.keys(data).some(key => !Object.prototype.hasOwnProperty.call(REG_TITLES, key))) {
    return 'Invalid registration fields.';
  }
  for (const key of Object.keys(REG_TITLES)) {
    if (key === 'confirm') continue;
    if (key.startsWith('m3-') && data[key] === undefined) data[key] = '';
    if (typeof data[key] !== 'string') return 'Check ' + REG_TITLES[key] + '.';
    data[key] = data[key].trim();
    if (!key.startsWith('m3-') && !data[key]) return 'Please fill in ' + REG_TITLES[key] + '.';
  }
  if (data.team.length > 30) return 'Team name must be at most 30 characters.';
  if (data.confirm !== true) return 'Please confirm that you have read the crew rules.';
  const third = ['m3-name', 'm3-phone', 'm3-email'].filter(key => data[key]).length;
  if (third !== 0 && third !== 3) return 'Enter all three Member 3 details or leave all three blank.';
  const phones = new Set();
  const emails = new Set();
  for (let i = 1; i <= (third ? 3 : 2); i++) {
    const phone = data['m' + i + '-phone'];
    const email = data['m' + i + '-email'].toLowerCase();
    if (!/^[0-9]{10}$/.test(phone)) return 'Member ' + i + ' needs a 10-digit phone number.';
    if (!/^[a-z0-9.!#$%&'*+/=?^_{}|~\x60-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(email)) {
      return 'Check the email address for member ' + i + '.';
    }
    if (phones.has(phone) || emails.has(email)) return 'Each member needs a different phone number and email address.';
    phones.add(phone);
    emails.add(email);
  }
  return '';
}

function regItems_(form) {
  if (form.getDestinationType() !== FormApp.DestinationType.SPREADSHEET ||
      form.getDestinationId() !== REG_SHEET_ID) throw Error('Unexpected response spreadsheet.');

  const expected = new Map(Object.entries(REG_TITLES).map(([key, title]) => [title, key]));
  const items = {};
  for (const item of form.getItems()) {
    const type = String(item.getType());
    if (['PAGE_BREAK', 'SECTION_HEADER', 'IMAGE', 'VIDEO'].includes(type)) continue;
    const key = expected.get(item.getTitle());
    if (!key || items[key] || type !== (key === 'confirm' ? 'CHECKBOX' : 'TEXT')) {
      throw Error('Unexpected, duplicate or mistyped question: ' + item.getTitle());
    }
    items[key] = key === 'confirm' ? item.asCheckboxItem() : item.asTextItem();
    if (items[key].isRequired() !== !key.startsWith('m3-')) throw Error('Check required setting: ' + REG_TITLES[key]);
  }
  for (const key of Object.keys(REG_TITLES)) {
    if (!items[key]) throw Error('Missing question: ' + REG_TITLES[key]);
  }
  const choices = items.confirm.getChoices();
  if (choices.length !== 1 || choices[0].getValue() !== REG_CHOICE) throw Error('Check the crew confirmation choice.');
  return items;
}

// Run from the editor. Read-only. A successful execution verifies the actual linked destination.
function verifyRegistrationForm() {
  const form = FormApp.openById(REG_FORM_ID);
  regItems_(form);
  if (!form.isAcceptingResponses()) throw Error('The form is currently closed.');
}

function regTeamKey_(name) {
  return String(name).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function regFields_(registration) {
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  if (!object(registration) || !object(registration.leader) || !object(registration.member2) ||
      (registration.member3 != null && !object(registration.member3))) return null;
  const { teamName, leader, member2, member3, acceptedCrewRules } = registration;
  const data = { team: teamName, college: leader.college, department: leader.department, year: leader.year, confirm: acceptedCrewRules };
  [leader, member2, member3 || {}].forEach((member, i) => {
    const prefix = 'm' + (i + 1) + '-';
    data[prefix + 'name'] = member.fullName;
    data[prefix + 'phone'] = member.phone;
    data[prefix + 'email'] = member.email;
  });
  return data;
}

function regFingerprint_(data) {
  const answers = Object.keys(REG_TITLES).map(key => {
    if (key.endsWith('-email')) return data[key].toLowerCase();
    return data[key];
  });
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(answers), Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes);
}

function regMatches_(response, items, submitted) {
  for (const key of Object.keys(REG_TITLES)) {
    const answer = response.getResponseForItem(items[key]);
    const raw = answer ? answer.getResponse() : '';
    if (key === 'confirm') {
      if (!Array.isArray(raw) || raw.length !== 1 || raw[0] !== REG_CHOICE) return false;
    } else {
      const value = String(raw || '').trim();
      if (key.endsWith('-email') ? value.toLowerCase() !== submitted[key].toLowerCase() : value !== submitted[key]) return false;
    }
  }
  return true;
}

function regRecord_(properties, key, entry, id) {
  if (typeof id !== 'string' || !id.trim()) return regError_('unavailable', 'Registration could not be confirmed.');
  properties.setProperty(key, JSON.stringify({ ...entry, id }));
  return { ok: true, responseId: id };
}

function regRegister_(properties, requestId, data) {
  const key = 'registration:v1:' + requestId;
  const now = Date.now();
  // Each property stores only a timestamp, digest and optional Google response ID.
  const records = properties.getProperties();
  const retained = [];
  for (const name of Object.keys(records)) {
    if (!name.startsWith('registration:v1:')) continue;
    const record = JSON.parse(records[name]);
    if (now - record.at > 48 * 3600000) properties.deleteProperty(name);
    else retained.push({ name, record });
  }
  const previous = retained.find(item => item.name === key);
  const hash = regFingerprint_(data);
  if (previous && previous.record.hash !== hash) return regError_('request_conflict', 'Request details changed.');
  if (previous && previous.record.id) return { ok: true, responseId: previous.record.id };

  const form = FormApp.openById(REG_FORM_ID);
  let items;
  try { items = regItems_(form); }
  catch (_) { return regError_('configuration', 'Registration configuration needs attention.'); }
  const team = regTeamKey_(data.team);
  for (const response of form.getResponses()) {
    const answer = response.getResponseForItem(items.team);
    if (!answer || regTeamKey_(answer.getResponse()) !== team) continue;
    if (previous && regMatches_(response, items, data)) {
      return regRecord_(properties, key, previous.record, response.getId());
    }
    return regError_('duplicate_team', 'A team with this name has already registered.');
  }
  if (!form.isAcceptingResponses()) return regError_('closed', 'Registration is currently closed.');
  if (previous && now - previous.record.at < 60000) return regError_('busy', 'Please retry shortly.');
  if (!previous && retained.length >= 600) {
    const oldest = retained.filter(item => item.record.id).sort((a, b) => a.record.at - b.record.at)[0];
    if (!oldest) return regError_('busy', 'Please retry shortly.');
    properties.deleteProperty(oldest.name);
  }
  const response = form.createResponse();
  for (const key of Object.keys(REG_TITLES)) {
    if (data[key] === '') continue;
    const value = key === 'confirm' ? [REG_CHOICE] : data[key];
    response.withItemResponse(items[key].createResponse(value));
  }
  // Write intent before the external commit so a lost acknowledgement can be reconciled.
  const entry = { hash, at: now };
  properties.setProperty(key, JSON.stringify(entry));
  const submitted = response.submit();
  return regRecord_(properties, key, entry, submitted.getId());
}

function doGet() {
  return regJson_({ ok: true, service: 'registration', version: 1 });
}

function doPost(e) {
  try {
    if (!e || !e.postData || typeof e.postData.contents !== 'string' ||
        e.contentLength > 16384 || e.postData.contents.length > 16384) {
      return regJson_(regError_('invalid_request', 'Missing or oversized registration.'));
    }
    let payload;
    try { payload = JSON.parse(e.postData.contents); }
    catch (_) { return regJson_(regError_('invalid_request', 'Expected a JSON registration.')); }
    const properties = PropertiesService.getScriptProperties();
    const secret = properties.getProperty('REGISTRATION_API_SECRET');
    if (!secret || secret.length < 32 || !payload || payload.secret !== secret) {
      return regJson_(regError_('unauthorized', 'Authentication failed.'));
    }
    if (typeof payload.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.requestId)) {
      return regJson_(regError_('validation', 'Invalid request ID.'));
    }
    const data = regFields_(payload.registration);
    const problem = regValidate_(data);
    if (problem) return regJson_(regError_('validation', problem));
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return regJson_(regError_('busy', 'Registration is busy.'));
    try { return regJson_(regRegister_(properties, payload.requestId, data)); }
    finally { lock.releaseLock(); }
  } catch (_) {
    return regJson_(regError_('unavailable', 'Registration could not be confirmed. Please retry using the same details.'));
  }
}
