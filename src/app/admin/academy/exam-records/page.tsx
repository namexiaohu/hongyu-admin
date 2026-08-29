import { Card, Empty, Typography } from 'antd';

export default function AcademyExamRecordsPage() {
  return (
    <Card>
      <Empty description="考试记录功能开发中，敬请期待" />
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        本期仅提供菜单入口，后续将展示学员考试记录与成绩。
      </Typography.Paragraph>
    </Card>
  );
}
