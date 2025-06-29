interface AcademicPeriod {
  year: string;   // e.g. "2024-2025"
  semester: 1 | 2;
}

export function getCurrentAcademicPeriod(): AcademicPeriod {
  const now = new Date();
  const Y = now.getFullYear();
  const m = now.getMonth(); // 0=Jan … 11=Dec

  let semester: 1 | 2;
  let startYear: number;

  // Sem 1: Sep (8)–Dec (11) of Y, or Jan (0)  Y
  if (m >= 8 || m === 0) {
    semester = 1;
    startYear = (m >= 8) ? Y : Y - 1;

    // Sem 2: Feb (1)–Jun (6) of Y
  } else if (m > 0 && m < 6) {
    semester = 2;
    startYear = Y - 1;

  } else {
    throw new Error("Currently outside any defined academic semester");
  }

  return {
    year: `${startYear}-${startYear + 1}`,
    semester,
  };
}
