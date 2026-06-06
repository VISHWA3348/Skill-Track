/**
 * centralized validation module for SkillTrack strict organizational hierarchy
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates that all required mapping fields are present and valid for a given role.
 */
export function validateUserHierarchy(role: string, data: any): ValidationResult {
  const errors: string[] = [];
  const normalizedRole = (role || '').toLowerCase();

  // Helper to extract field value supporting both camelCase and snake_case
  const getField = (fields: string[]) => {
    for (const f of fields) {
      if (data[f] !== undefined && data[f] !== null && String(data[f]).trim() !== '') {
        return data[f];
      }
    }
    return null;
  };

  const collegeId = getField(['college_id', 'collegeId']);
  const departmentId = getField(['department_id', 'departmentId']);
  const academicYear = getField(['academic_year', 'academicYear']);
  const semester = getField(['semester', 'current_semester', 'currentSemester']);
  const employeeId = getField(['employee_id', 'employeeId']);
  const designation = getField(['designation']);
  const registerNo = getField(['register_no', 'registerNo', 'roll_no', 'rollNo']);

  if (normalizedRole === 'superadmin') {
    // Super Admins don't have constraints
    return { valid: true, errors: [] };
  }

  // Every other role MUST have college mapping
  if (!collegeId) {
    errors.push("College selection is required.");
  }

  if (normalizedRole === 'admin') {
    // College Admins only need College
    // Designation is optional/recommended but not block-worthy
  } else if (normalizedRole === 'hod') {
    if (!departmentId) {
      errors.push("Department selection is required.");
    }
    if (!employeeId) {
      errors.push("Employee ID is required.");
    }
    if (!designation) {
      errors.push("Designation is required.");
    }
  } else if (normalizedRole === 'staff') {
    if (!departmentId) {
      errors.push("Department selection is required.");
    }
    if (!academicYear) {
      errors.push("Academic Year is required.");
    }
    if (semester === null) {
      errors.push("Semester selection is required.");
    }
    if (!employeeId) {
      errors.push("Employee ID is required.");
    }
    if (!designation) {
      errors.push("Designation is required.");
    }
  } else if (normalizedRole === 'student') {
    if (!departmentId) {
      errors.push("Department selection is required.");
    }
    if (!academicYear) {
      errors.push("Academic Year is required.");
    }
    if (semester === null) {
      errors.push("Semester selection is required.");
    }
    if (!registerNo) {
      errors.push("Register Number / Roll Number is required.");
    }
  } else {
    errors.push(`Unknown role: ${role}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates that a user can only access resources within their scope.
 */
export function validateScopeAccess(callerRole: string, callerData: any, targetData: any): boolean {
  const normalizedRole = (callerRole || '').toLowerCase();
  if (normalizedRole === 'superadmin') {
    return true;
  }

  const getVal = (obj: any, keys: string[]) => {
    if (!obj) return null;
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) return String(obj[k]);
    }
    return null;
  };

  const callerCollege = getVal(callerData, ['college_id', 'collegeId']);
  const targetCollege = getVal(targetData, ['college_id', 'collegeId']);

  // Check college alignment (all roles besides Super Admin must match college)
  if (!callerCollege || callerCollege !== targetCollege) {
    return false;
  }

  if (normalizedRole === 'admin') {
    return true; // College-level admin has full access to their college
  }

  // HOD scope verification: same department
  const callerDept = getVal(callerData, ['department_id', 'departmentId']);
  const targetDept = getVal(targetData, ['department_id', 'departmentId']);
  if (normalizedRole === 'hod') {
    return !!callerDept && callerDept === targetDept;
  }

  // Staff scope verification: same department, academic year, semester
  const callerYear = getVal(callerData, ['academic_year', 'academicYear']);
  const callerSem = getVal(callerData, ['semester', 'current_semester', 'currentSemester']);
  const targetYear = getVal(targetData, ['academic_year', 'academicYear']);
  const targetSem = getVal(targetData, ['semester', 'current_semester', 'currentSemester']);

  if (normalizedRole === 'staff') {
    const deptMatch = !!callerDept && callerDept === targetDept;
    const yearMatch = !!callerYear && callerYear === targetYear;
    const semMatch = !!callerSem && callerSem === targetSem;
    return deptMatch && yearMatch && semMatch;
  }

  // Student scope verification: only own profile/records
  if (normalizedRole === 'student') {
    const callerUid = getVal(callerData, ['uid', 'id', 'user_id', 'userId']);
    const targetUid = getVal(targetData, ['uid', 'id', 'user_id', 'userId', 'student_id', 'studentId']);
    return !!callerUid && callerUid === targetUid;
  }

  return false;
}

/**
 * Auto-resolves college_name and department_name from IDs using database queries.
 */
export function resolveOrganizationNames(
  db: any,
  collegeId: string | null | undefined,
  departmentId?: string | null | undefined
): { collegeName: string | null; departmentName: string | null } {
  let collegeName: string | null = null;
  let departmentName: string | null = null;

  if (collegeId) {
    try {
      const col = db.prepare('SELECT name FROM colleges WHERE id = ?').get(collegeId) as any;
      if (col) collegeName = col.name;
    } catch (err) {}
  }

  if (departmentId) {
    try {
      const dept = db.prepare('SELECT name FROM departments WHERE id = ?').get(departmentId) as any;
      if (dept) departmentName = dept.name;
    } catch (err) {}
  }

  return { collegeName, departmentName };
}
