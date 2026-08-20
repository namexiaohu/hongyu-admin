'use client';

import { Button, Card, Form, Input, message } from 'antd';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/admin';
  const [loading, setLoading] = useState(false);

  return (
    <Card title="Admin Sign In" style={{ width: 420 }}>
      <Form
        layout="vertical"
        onFinish={async (values: { email: string; password: string }) => {
          setLoading(true);
          try {
            const result = await signIn('credentials', {
              email: values.email,
              password: values.password,
              redirect: false,
              callbackUrl,
            });

            if (result?.error) {
              setLoading(false);
              message.error('登录失败，邮箱或密码错误');
              return;
            }

            message.success('登录成功');
            router.push(callbackUrl);
            router.refresh();
          } catch {
            setLoading(false);
            message.error('登录失败，请稍后重试');
          }
        }}
      >
        <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
          <Input autoComplete="username" />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={[{ required: true, min: 6 }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block style={{ marginTop: 16 }}>
          Sign In
        </Button>
      </Form>
    </Card>
  );
}

export default function AdminLoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f6f7f9',
      }}
    >
      <Suspense fallback={<div style={{ padding: 80, textAlign: 'center' }}>Loading...</div>}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
