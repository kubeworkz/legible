interface Props {
  size?: number;
  color?: string;
}

export const Logo = (props: Props) => {
  const { size = 30 } = props;
  return (
    <img
      src="/images/logo.svg"
      alt="Legible"
      style={{ height: size, width: 'auto' }}
    />
  );
};
