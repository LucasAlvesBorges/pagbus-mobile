/**
 * Utilitários para formatação de valores monetários
 */

/**
 * Formata um valor numérico para o padrão monetário brasileiro (R$ X,XX)
 * @param value - Valor numérico ou string
 * @returns String formatada no padrão brasileiro
 */
export const formatCurrency = (value: string | number | undefined): string => {
  if (!value) return '0,00';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0,00';
  
  return numValue.toFixed(2).replace('.', ',');
};

/**
 * Formata um valor numérico para o padrão monetário brasileiro com símbolo R$
 * @param value - Valor numérico ou string
 * @returns String formatada com símbolo R$
 */
export const formatCurrencyWithSymbol = (value: string | number | undefined): string => {
  return `R$ ${formatCurrency(value)}`;
};

/**
 * Converte string monetária brasileira para número
 * @param value - String no formato "X,XX"
 * @returns Número decimal
 */
export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  
  // Remove espaços e converte vírgula para ponto
  const cleanValue = value.replace(/\s/g, '').replace(',', '.');
  
  return parseFloat(cleanValue) || 0;
};
