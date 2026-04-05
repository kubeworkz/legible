import { useRouter } from 'next/router';
import { Card, Col, Row, Space, Typography } from 'antd';
import FileTextOutlined from '@ant-design/icons/FileTextOutlined';
import ApiOutlined from '@ant-design/icons/ApiOutlined';
import ApartmentOutlined from '@ant-design/icons/ApartmentOutlined';
import RobotOutlined from '@ant-design/icons/RobotOutlined';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import { Path, buildPath } from '@/utils/enum';
import useProject from '@/hooks/useProject';

const { Text } = Typography;

const sections = [
  {
    title: 'Prompt Templates',
    icon: <FileTextOutlined style={{ fontSize: 28 }} />,
    description:
      'Create and version system/user prompts with variable interpolation. Configure model, temperature, and tags.',
    path: Path.AgentBuilderPromptTemplates,
  },
  {
    title: 'Tool Registry',
    icon: <ApiOutlined style={{ fontSize: 28 }} />,
    description:
      'Register MCP tools, custom APIs, and built-in tools that agents can invoke during workflows.',
    path: Path.AgentBuilderToolRegistry,
  },
  {
    title: 'Workflows',
    icon: <ApartmentOutlined style={{ fontSize: 28 }} />,
    description:
      'Define multi-step agent workflows as directed graphs. Publish, version, and manage lifecycle.',
    path: Path.AgentBuilderWorkflows,
  },
  {
    title: 'Agent Definitions',
    icon: <RobotOutlined style={{ fontSize: 28 }} />,
    description:
      'Bundle a workflow, system prompt, tools, and memory config into a deployable agent unit.',
    path: Path.AgentBuilderAgents,
  },
];

export default function AgentBuilderPage() {
  const router = useRouter();
  const { currentProjectId } = useProject();
  const bp = (path: Path) => buildPath(path, currentProjectId);

  return (
    <SiderLayout>
      <PageLayout
        title="Agent Builder"
        description="Build custom AI agents with prompt templates, tool integrations, and multi-step workflows."
      >
        <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
          {sections.map((section) => (
            <Col xs={24} sm={12} lg={8} key={section.title}>
              <Card
                hoverable
                onClick={() => router.push(bp(section.path))}
                style={{ height: '100%' }}
              >
                <Space direction="vertical" size="small">
                  <Space>
                    {section.icon}
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      {section.title}
                    </Typography.Title>
                  </Space>
                  <Text type="secondary">{section.description}</Text>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </PageLayout>
    </SiderLayout>
  );
}
