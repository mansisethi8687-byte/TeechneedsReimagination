export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// --- Programs --- //
export async function createProgram(name) {
  const res = await fetch(`${BASE_URL}/api/programs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create program');
  }
  return res.json();
}

export async function getAllPrograms() {
  const res = await fetch(`${BASE_URL}/api/programs`);
  if (!res.ok) throw new Error('Failed to fetch programs');
  return res.json();
}

export async function addMentorToProgram(programId, mentorId) {
  const res = await fetch(`${BASE_URL}/api/programs/${programId}/add-mentor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mentorId }),
  });
  if (!res.ok) throw new Error('Failed to assign mentor');
  return res.json();
}

// --- Mentors --- //
export async function createMentor(data) {
  const res = await fetch(`${BASE_URL}/api/mentors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create mentor');
  }
  return res.json();
}

export async function getAllMentors() {
  const res = await fetch(`${BASE_URL}/api/mentors`);
  if (!res.ok) throw new Error('Failed to fetch mentors');
  return res.json();
}

export async function mentorLogin(email, password) {
  const res = await fetch(`${BASE_URL}/api/mentors/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Login failed');
  }
  return res.json(); // returns { token, mentor }
}

export async function getMentorDetails(token) {
  const res = await fetch(`${BASE_URL}/api/mentors/me`, {
    method: 'GET',
    headers: {
      'x-auth-token': token,
    },
  });
  if (!res.ok) throw new Error('Failed to fetch mentor details');
  return res.json();
}

// --- Mentees & Resources Management (by Mentor) --- //
export async function addMentee(token, { email, name, enrollmentNumber, programId }) {
  const res = await fetch(`${BASE_URL}/api/mentees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token
    },
    body: JSON.stringify({ email, name, enrollmentNumber, programId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to add mentee');
  }
  return res.json(); // returns { mentee, tempPassword }
}

export async function addResource(token, resourceData, isQuiz = false) {
  const endpoint = isQuiz ? '/api/resources/quiz' : '/api/resources';

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token,
    },
    body: JSON.stringify(resourceData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add resource');
  }

  return res.json();
}

export async function getProgramMentees(programId, token) {
  const res = await fetch(`${BASE_URL}/api/${programId}/mentees`, {
    headers: {
      'x-auth-token': token
    }
  });
  if (!res.ok) throw new Error('Failed to fetch mentees');
  return res.json();
}

export async function getProgramResources(programId, token) {
  const res = await fetch(`${BASE_URL}/api/${programId}/resources`, {
    headers: {
      'x-auth-token': token
    }
  });
  if (!res.ok) throw new Error('Failed to fetch resources');
  return res.json();
}

export async function getUnverifiedProjects(token) {
  const res = await fetch(`${BASE_URL}/api/unverified-projects`, {
    headers: {
      'x-auth-token': token
    }
  });
  if (!res.ok) throw new Error('Failed to fetch unverified projects');
  return res.json();
}

export async function verifyProject(token, menteeId, resourceId, score) {
  const res = await fetch(`${BASE_URL}/api/${menteeId}/resources/${resourceId}/verify`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token
    },
    body: JSON.stringify({ score })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to verify project');
  }
  return res.json();
}

// --- Mentee Client Methods --- //
export async function menteeLogin(enrollmentNumber, password) {
  const res = await fetch(`${BASE_URL}/api/m/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enrollmentNumber, password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Login failed');
  }
  return res.json(); // returns { token, mentee }
}

export async function getMenteeDashboard(token) {
  const res = await fetch(`${BASE_URL}/api/m/dashboard`, {
    headers: {
      'x-auth-token': token
    }
  });
  if (!res.ok) throw new Error('Failed to fetch mentee dashboard');
  return res.json();
}

export async function completeResource(token, resourceId) {
  const res = await fetch(`${BASE_URL}/api/m/resources/${resourceId}/complete`, {
    method: 'POST',
    headers: {
      'x-auth-token': token
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to complete resource');
  }
  return res.json();
}

export async function getQuizData(token, resourceId) {
  const res = await fetch(`${BASE_URL}/api/m/resources/${resourceId}/quiz`, {
    headers: {
      'x-auth-token': token
    }
  });
  if (!res.ok) throw new Error('Failed to load quiz');
  return res.json();
}

export async function submitQuiz(token, resourceId, answers) {
  const res = await fetch(`${BASE_URL}/api/m/resources/${resourceId}/quiz/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token
    },
    body: JSON.stringify({ answers })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit quiz');
  }
  return res.json();
}

export async function submitProject(token, resourceId, projectData) {
  const res = await fetch(`${BASE_URL}/api/m/resources/${resourceId}/project`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token
    },
    body: JSON.stringify(projectData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit project');
  }
  return res.json();
}

export async function getLeaderboard(limit = 50, skip = 0) {
  const res = await fetch(`${BASE_URL}/api/m/leaderboard?limit=${limit}&skip=${skip}`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return res.json();
}

export async function getPublicProfile(id) {
  const res = await fetch(`${BASE_URL}/api/m/profile/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch public profile');
  }
  return res.json();
}

  