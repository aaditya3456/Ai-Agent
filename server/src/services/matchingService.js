/**
 * Service providing transparent compatibility analysis between candidate resume and job criteria.
 * Adheres strictly to non-hallucinatory evaluation and heuristic indicators rather than hiring predictions.
 */
export const compareResumeToJob = (resume, job) => {
  if (!resume || !job) {
    throw new Error('Both resume and job objects are required for comparison');
  }

  const resumeSkills = new Set(
    (resume.skills || []).map((s) => s.toLowerCase().trim())
  );

  // Also include skills from parsedProfile in case not in flat array
  const profile = resume.parsedProfile || {};
  [
    ...(profile.programmingLanguages || []),
    ...(profile.frameworks || []),
    ...(profile.databases || []),
    ...(profile.tools || []),
    ...(profile.otherSkills || []),
  ].forEach((s) => resumeSkills.add(s.toLowerCase().trim()));

  const jobAnalysis = job.parsedAnalysis || {};
  const requiredSkills = (jobAnalysis.requiredSkills || []).map((s) => s.trim());
  const preferredSkills = (jobAnalysis.preferredSkills || []).map((s) => s.trim());

  // If no structured skills in job analysis, fallback to flat skills or empty
  const allJobRequirements = requiredSkills.length > 0 ? requiredSkills : (job.skills || []);

  const matchedSkills = [];
  const missingRequiredSkills = [];
  const missingPreferredSkills = [];

  // Match required skills
  for (const skill of allJobRequirements) {
    const sLower = skill.toLowerCase();
    const hasMatch = Array.from(resumeSkills).some(
      (userSkill) => userSkill === sLower || userSkill.includes(sLower) || sLower.includes(userSkill)
    );
    if (hasMatch) {
      matchedSkills.push(skill);
    } else {
      missingRequiredSkills.push(skill);
    }
  }

  // Match preferred skills
  for (const skill of preferredSkills) {
    const sLower = skill.toLowerCase();
    const hasMatch = Array.from(resumeSkills).some(
      (userSkill) => userSkill === sLower || userSkill.includes(sLower) || sLower.includes(userSkill)
    );
    if (hasMatch) {
      if (!matchedSkills.includes(skill)) {
        matchedSkills.push(skill);
      }
    } else {
      missingPreferredSkills.push(skill);
    }
  }

  // Identify relevant projects from resume
  const relevantProjects = [];
  if (Array.isArray(profile.projects)) {
    for (const proj of profile.projects) {
      const projTech = (proj.technologies || []).map((t) => t.toLowerCase());
      const overlaps = projTech.filter((t) =>
        matchedSkills.some((ms) => ms.toLowerCase().includes(t) || t.includes(ms.toLowerCase()))
      );
      if (overlaps.length > 0) {
        relevantProjects.push({
          name: proj.name,
          description: proj.description,
          overlappingTech: overlaps,
        });
      }
    }
  }

  // Identify relevant experience
  const relevantExperience = [];
  if (Array.isArray(profile.experience)) {
    for (const exp of profile.experience) {
      const expText = `${exp.title} ${exp.description || ''} ${(exp.achievements || []).join(' ')}`.toLowerCase();
      const matchedKeywords = matchedSkills.filter((ms) => expText.includes(ms.toLowerCase()));
      if (matchedKeywords.length > 0) {
        relevantExperience.push({
          title: exp.title,
          company: exp.company,
          relevantSkills: matchedKeywords,
        });
      }
    }
  }

  // Calculate transparent heuristic score (0 - 100)
  // Weight: Required skills account for 70%, Preferred account for 30%
  let score = 0;
  const totalReq = allJobRequirements.length;
  const matchedReq = allJobRequirements.length - missingRequiredSkills.length;

  if (totalReq > 0) {
    const reqRatio = matchedReq / totalReq;
    score += reqRatio * 70;
  } else {
    score += 50; // Neutral baseline if no specific requirements parsed
  }

  if (preferredSkills.length > 0) {
    const prefRatio = (preferredSkills.length - missingPreferredSkills.length) / preferredSkills.length;
    score += prefRatio * 30;
  } else {
    score += 30; // Grant remaining portion if no distinct preferred skills specified
  }

  const roundedScore = Math.min(100, Math.max(0, Math.round(score)));

  // Generate transparent human-readable compatibility explanation
  let analysisSummary = `Compatibility heuristic: ${roundedScore}% match based on declared skills alignment. `;
  if (matchedSkills.length > 0) {
    analysisSummary += `Your profile demonstrates overlap in ${matchedSkills.length} key competencies (${matchedSkills.slice(0, 4).join(', ')}${matchedSkills.length > 4 ? '...' : ''}). `;
  }
  if (missingRequiredSkills.length > 0) {
    analysisSummary += `Key missing or unlisted required skills include: ${missingRequiredSkills.slice(0, 3).join(', ')}. `;
  } else {
    analysisSummary += 'All primary required qualifications are represented on your resume. ';
  }
  analysisSummary += 'Note: This evaluation represents an automated heuristic overlap and is not a hiring guarantee or outcome prediction.';

  return {
    isMatched: true,
    matchScore: roundedScore,
    matchedSkills,
    missingRequiredSkills,
    missingPreferredSkills,
    relevantExperience,
    relevantProjects,
    analysis: analysisSummary,
    lastMatchedAt: new Date(),
  };
};
