import { useState } from 'react';
import { Button, message } from 'antd';
import { useMutation, useQuery } from '@apollo/client';
import styled from 'styled-components';
import { OIDC_PROVIDERS, OIDC_AUTH_URL } from '@/apollo/client/graphql/oidc';
import { storeOidcParams } from '@/pages/oidc/callback';

const SsoContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

// Provider icon mapping (extensible)
const PROVIDER_ICONS: Record<string, string> = {
  google: '🔵',
  microsoft: '🟦',
  github: '⬛',
  okta: '🔷',
};

interface SsoButtonsProps {
  /** Text prefix: "Sign in" or "Sign up" */
  actionText?: string;
}

export default function SsoButtons({ actionText = 'Continue' }: SsoButtonsProps) {
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  const { data, loading: providersLoading } = useQuery(OIDC_PROVIDERS, {
    fetchPolicy: 'cache-and-network',
  });

  const [getAuthUrl] = useMutation(OIDC_AUTH_URL);

  const providers = data?.oidcProviders || [];

  if (providersLoading || providers.length === 0) {
    return null;
  }

  const handleSsoClick = async (slug: string) => {
    setLoadingSlug(slug);
    try {
      const callbackUrl = `${window.location.origin}/oidc/callback`;
      const { data: authData } = await getAuthUrl({
        variables: { providerSlug: slug, callbackUrl },
      });

      const { url, state, nonce } = authData.oidcAuthUrl;

      // Store params for the callback page
      storeOidcParams(slug, state, nonce);

      // Redirect to the identity provider
      window.location.href = url;
    } catch (err: any) {
      const msg =
        err?.graphQLErrors?.[0]?.message ||
        err?.message ||
        'Failed to start SSO sign-in';
      message.error(msg);
      setLoadingSlug(null);
    }
  };

  return (
    <SsoContainer>
      {providers.map((provider: any) => (
        <Button
          key={provider.slug}
          block
          size="large"
          loading={loadingSlug === provider.slug}
          disabled={!!loadingSlug}
          onClick={() => handleSsoClick(provider.slug)}
        >
          {PROVIDER_ICONS[provider.slug] || '🔑'}{' '}
          {actionText} with {provider.displayName}
        </Button>
      ))}
    </SsoContainer>
  );
}
