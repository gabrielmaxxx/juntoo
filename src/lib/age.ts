/** Utilitários de idade (regra: mínimo 18 anos). */

export const calculateAge = (birthDate: string | Date): number | null => {
  const date = typeof birthDate === 'string' ? new Date(`${birthDate}T00:00:00`) : birthDate;
  if (!date || isNaN(date.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age--;
  }
  return age;
};

export const isValidBirthDate = (birthDate: string): boolean => {
  const age = calculateAge(birthDate);
  return age !== null && age >= 0 && age <= 120;
};

export const isUnderage = (birthDate: string): boolean => {
  const age = calculateAge(birthDate);
  return age !== null && age < 18;
};

export const UNDERAGE_MESSAGE =
  'O Juntoo é exclusivo para maiores de 18 anos. Pela data de nascimento informada, você ainda não tem idade para criar uma conta.';
