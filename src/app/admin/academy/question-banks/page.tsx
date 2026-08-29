import { Card, Empty, Typography } from 'antd';

export default function AcademyQuestionBanksPage() {
  return (
    <Card>
      <Empty description="题库管理功能开发中，敬请期待" />
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        本期仅提供菜单入口，后续将支持单选、多选、判断、填空等题型管理。
      </Typography.Paragraph>
    </Card>
  );
}
