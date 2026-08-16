/**
 * Layout для защищённой части администраторской панели (route group).
 * Авторизация обрабатывается в proxy.js — здесь только UI-обёртка.
 */
import AdminLayoutClient from '../AdminLayoutClient';

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function PanelLayout({ children }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
