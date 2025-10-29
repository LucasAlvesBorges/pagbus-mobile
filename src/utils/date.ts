/**
 * Utilitários para formatação de datas no fuso horário de Brasília (America/Sao_Paulo)
 * Brasília está em UTC-3
 */

/**
 * Converte uma data UTC para o fuso horário de Brasília (UTC-3)
 */
const convertToBrasilia = (date: Date): Date => {
  // O JavaScript trabalha com UTC internamente
  // Brasília é UTC-3, então subtraímos 3 horas
  const brasiliaOffsetMs = -3 * 60 * 60 * 1000; // -3 horas em milissegundos
  return new Date(date.getTime() + brasiliaOffsetMs);
};

/**
 * Formata uma data para o formato brasileiro (DD/MM/YYYY HH:MM)
 * usando o fuso horário de Brasília
 */
export const formatDateToBrasilia = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Se a string já contém timezone (ISO 8601), o JavaScript converte automaticamente
    // Precisamos pegar os valores UTC e converter para Brasília (UTC-3)
    const utcYear = date.getUTCFullYear();
    const utcMonth = date.getUTCMonth();
    const utcDay = date.getUTCDate();
    const utcHours = date.getUTCHours();
    const utcMinutes = date.getUTCMinutes();
    
    // Converter para Brasília (UTC-3): subtrair 3 horas
    let brasiliaHours = utcHours - 3;
    let brasiliaDay = utcDay;
    let brasiliaMonth = utcMonth;
    let brasiliaYear = utcYear;
    
    // Se as horas ficaram negativas, ajustar o dia
    if (brasiliaHours < 0) {
      brasiliaHours += 24;
      brasiliaDay -= 1;
      
      // Se o dia ficou negativo, ajustar o mês
      if (brasiliaDay < 1) {
        brasiliaMonth -= 1;
        if (brasiliaMonth < 0) {
          brasiliaMonth = 11;
          brasiliaYear -= 1;
        }
        // Pegar o último dia do mês anterior
        const lastDayOfMonth = new Date(Date.UTC(brasiliaYear, brasiliaMonth + 1, 0)).getUTCDate();
        brasiliaDay = lastDayOfMonth;
      }
    }
    
    const day = brasiliaDay.toString().padStart(2, '0');
    const month = (brasiliaMonth + 1).toString().padStart(2, '0');
    const year = brasiliaYear.toString();
    const hours = brasiliaHours.toString().padStart(2, '0');
    const minutes = utcMinutes.toString().padStart(2, '0');
    
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  } catch (error) {
    return typeof dateString === 'string' ? dateString : dateString.toString();
  }
};

/**
 * Formata apenas a data (DD/MM/YYYY) no fuso horário de Brasília
 */
export const formatDateOnly = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    const utcYear = date.getUTCFullYear();
    const utcMonth = date.getUTCMonth();
    const utcDay = date.getUTCDate();
    const utcHours = date.getUTCHours();
    
    // Converter para Brasília (UTC-3)
    let brasiliaDay = utcDay;
    let brasiliaMonth = utcMonth;
    let brasiliaYear = utcYear;
    
    // Se antes das 3h UTC, está no dia anterior em Brasília
    if (utcHours < 3) {
      brasiliaDay -= 1;
      if (brasiliaDay < 1) {
        brasiliaMonth -= 1;
        if (brasiliaMonth < 0) {
          brasiliaMonth = 11;
          brasiliaYear -= 1;
        }
        const lastDayOfMonth = new Date(Date.UTC(brasiliaYear, brasiliaMonth + 1, 0)).getUTCDate();
        brasiliaDay = lastDayOfMonth;
      }
    }
    
    const day = brasiliaDay.toString().padStart(2, '0');
    const month = (brasiliaMonth + 1).toString().padStart(2, '0');
    const year = brasiliaYear.toString();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return typeof dateString === 'string' ? dateString : dateString.toString();
  }
};

/**
 * Formata apenas o horário (HH:MM) no fuso horário de Brasília
 */
export const formatTimeOnly = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    const utcHours = date.getUTCHours();
    const utcMinutes = date.getUTCMinutes();
    
    // Converter para Brasília (UTC-3)
    let brasiliaHours = utcHours - 3;
    if (brasiliaHours < 0) {
      brasiliaHours += 24;
    }
    
    const hours = brasiliaHours.toString().padStart(2, '0');
    const minutes = utcMinutes.toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
  } catch (error) {
    return '';
  }
};

/**
 * Obtém a data e hora atual formatada no fuso horário de Brasília
 */
export const getCurrentBrasiliaDateTime = (): string => {
  return formatDateToBrasilia(new Date());
};
