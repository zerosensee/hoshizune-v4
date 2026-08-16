/**
 * Утилита для надежного копирования текста в буфер обмена.
 * Поддерживает Modern Clipboard API и резервный метод через execCommand.
 * 
 * @param {string} text - Текст для копирования в буфер обмена
 * @returns {Promise<boolean>} Флаг успешного копирования
 */
export async function copyToClipboard(text) {
  if (!text) return false;

  // 1. Попытка через современный Navigator Clipboard API
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    navigator.clipboard.writeText
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn(
        'Ошибка navigator.clipboard.writeText, переход на fallback:',
        err
      );
    }
  }

  // 2. Fallback для контекстов без SSL (http://) или ограничений безопасности
  try {
    if (typeof document === 'undefined') return false;
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackErr) {
    console.error('Не удалось скопировать текст в буфер обмена:', fallbackErr);
    return false;
  }
}
