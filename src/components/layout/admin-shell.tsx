'use client';

import {
  AppstoreOutlined,
  BankOutlined,
  BarsOutlined,
  CalendarOutlined,
  CommentOutlined,
  DashboardOutlined,
  FileTextOutlined,
  GiftOutlined,
  GlobalOutlined,
  DollarOutlined,
  InboxOutlined,
  OrderedListOutlined,
  SettingOutlined,
  ShareAltOutlined,
  ShoppingOutlined,
  TagsOutlined,
  TeamOutlined,
  TranslationOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PropsWithChildren } from 'react';

import {
  adminNavItems,
  getAdminNavOpenKeys,
  getAdminNavSelectedKey,
  getAdminPageTitle,
  type AdminNavItem,
} from '@/lib/admin-navigation';
import { AdminProfileMenu } from '@/components/layout/admin-profile-menu';

const { Header, Sider, Content } = Layout;

const iconByKey: Record<string, React.ReactNode> = {
  '/admin': <DashboardOutlined />,
  'product-management': <ShoppingOutlined />,
  '/admin/products': <ShoppingOutlined />,
  '/admin/products/boards': <AppstoreOutlined />,
  '/admin/categories': <AppstoreOutlined />,
  '/admin/brands': <TagsOutlined />,
  '/admin/product-features': <AppstoreOutlined />,
  '/admin/volume-pricing': <BarsOutlined />,
  'promotion': <GiftOutlined />,
  '/admin/promotion/coupons': <GiftOutlined />,
  'warehouse-logistics': <InboxOutlined />,
  '/admin/logistics/shipping': <GlobalOutlined />,
  'order-management': <OrderedListOutlined />,
  '/admin/orders': <OrderedListOutlined />,
  '/admin/inquiries': <CommentOutlined />,
  '/admin/customers': <TeamOutlined />,
  'exclusive-content': <FileTextOutlined />,
  'content-management': <BarsOutlined />,
  '/admin/solutions': <AppstoreOutlined />,
  '/admin/brand-narratives': <FileTextOutlined />,
  '/admin/surgeons': <TeamOutlined />,
  '/admin/partner-centers': <GlobalOutlined />,
  '/admin/summits': <CalendarOutlined />,
  '/admin/company': <BankOutlined />,
  '/admin/social-media': <ShareAltOutlined />,
  '/admin/editorial/boards': <AppstoreOutlined />,
  '/admin/faq': <FileTextOutlined />,
  '/admin/editorial': <FileTextOutlined />,
  'site-management': <SettingOutlined />,
  '/admin/languages': <GlobalOutlined />,
  '/admin/ui-strings': <TranslationOutlined />,
  '/admin/site/config': <SettingOutlined />,
  '/admin/site/exchange-rates': <DollarOutlined />,
};

function toMenuItems(items: AdminNavItem[]): NonNullable<MenuProps['items']> {
  return items.map((item) => ({
    key: item.key,
    icon: iconByKey[item.key],
    label: item.href ? <Link href={item.href}>{item.title}</Link> : item.title,
    children: item.children ? toMenuItems(item.children) : undefined,
  }));
}

const menuItems = toMenuItems(adminNavItems);

export function AdminShell({
  children,
  siteUrl,
  panelTitle,
  panelSubtitle,
}: PropsWithChildren<{ siteUrl: string; panelTitle: string; panelSubtitle: string }>) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login' || pathname.startsWith('/admin/login/');
  const pageTitle = getAdminPageTitle(pathname);
  const selected = getAdminNavSelectedKey(pathname);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={240} theme="light" style={{ borderRight: '1px solid #e5e7eb' }}>
        <div style={{ padding: '20px 20px 8px' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {panelTitle}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {panelSubtitle}
          </Typography.Paragraph>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selected]}
          defaultOpenKeys={getAdminNavOpenKeys(pathname)}
          items={menuItems}
          style={{ borderInlineEnd: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingInline: 24,
            height: 56,
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            {pageTitle}
          </Typography.Title>
          <Space size="middle">
            <Button href={siteUrl} type="default" target="_blank" rel="noreferrer">
              查看商城前台
            </Button>
            <AdminProfileMenu />
          </Space>
        </Header>
        <Content style={{ padding: 24, background: '#f6f7f9' }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
