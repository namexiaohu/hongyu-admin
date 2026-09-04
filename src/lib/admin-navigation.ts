import type { ReactNode } from 'react';

export type AdminNavItem = {
  key: string;
  title: string;
  icon?: ReactNode;
  href?: string;
  children?: AdminNavItem[];
};

export const adminNavItems: AdminNavItem[] = [
  { key: '/admin', title: '仪表盘', href: '/admin' },
  {
    key: 'product-management',
    title: '产品管理',
    children: [
      { key: '/admin/products', title: '产品管理', href: '/admin/products' },
      { key: '/admin/products/boards', title: '产品看板', href: '/admin/products/boards' },
    ],
  },
  {
    key: 'order-management',
    title: '订单管理',
    children: [
      { key: '/admin/inquiries', title: '询盘管理', href: '/admin/inquiries' },
      { key: '/admin/customers', title: '客户管理', href: '/admin/customers' },
    ],
  },
  {
    key: 'exclusive-content',
    title: '企业内容',
    children: [
      { key: '/admin/brand-narratives', title: '企业叙事', href: '/admin/brand-narratives' },
      { key: '/admin/solutions', title: '解决方案', href: '/admin/solutions' },
      { key: '/admin/surgeons', title: '认证术者', href: '/admin/surgeons' },
      { key: '/admin/partner-centers', title: '合作中心', href: '/admin/partner-centers' },
      { key: '/admin/summits', title: '行业峰会', href: '/admin/summits' },
      { key: '/admin/company', title: '企业信息', href: '/admin/company' },
      { key: '/admin/social-media', title: '社交媒体', href: '/admin/social-media' },
      { key: '/admin/homepage', title: '首页配置', href: '/admin/homepage' },
      { key: '/admin/website-config', title: '网站配置', href: '/admin/website-config' },
    ],
  },
  {
    key: 'content-management',
    title: '内容管理',
    children: [
      { key: '/admin/editorial/boards', title: '内容看板', href: '/admin/editorial/boards' },
      { key: '/admin/editorial', title: '博客管理', href: '/admin/editorial' },
      { key: '/admin/other-content', title: '其他内容', href: '/admin/other-content' },
    ],
  },
  {
    key: 'course-management',
    title: '课程管理',
    children: [
      { key: '/admin/academy/certificates', title: '证书管理', href: '/admin/academy/certificates' },
      { key: '/admin/academy/courses', title: '课程管理', href: '/admin/academy/courses' },
      { key: '/admin/academy/question-banks', title: '题库管理', href: '/admin/academy/question-banks' },
      { key: '/admin/academy/exam-records', title: '考试记录', href: '/admin/academy/exam-records' },
    ],
  },
  {
    key: 'site-management',
    title: '站点管理',
    children: [
      { key: '/admin/languages', title: '多语言', href: '/admin/languages' },
      { key: '/admin/ui-strings', title: '主站文案翻译', href: '/admin/ui-strings' },
      { key: '/admin/course-ui-strings', title: '课程站文案翻译', href: '/admin/course-ui-strings' },
    ],
  },
];

function flattenNavItems(items: AdminNavItem[]): AdminNavItem[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenNavItems(item.children) : [])]);
}

const flattenedNavItems = flattenNavItems(adminNavItems);

export function getAdminPageTitle(pathname: string) {
  const match = [...flattenedNavItems]
    .filter((item) => item.href)
    .sort((left, right) => right.key.length - left.key.length)
    .find((item) => pathname === item.key || pathname.startsWith(`${item.key}/`));

  return match?.title ?? '后台管理系统';
}

export function getAdminNavOpenKeys(pathname: string) {
  return adminNavItems
    .filter((item) => item.children?.some((child) => pathname === child.key || pathname.startsWith(`${child.key}/`)))
    .map((item) => item.key);
}

export function getAdminNavSelectedKey(pathname: string) {
  return [...flattenedNavItems]
    .filter((item) => item.href)
    .sort((left, right) => right.key.length - left.key.length)
    .find((item) => pathname === item.key || pathname.startsWith(`${item.key}/`))?.key ?? '/admin';
}
