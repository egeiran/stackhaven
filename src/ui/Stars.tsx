interface StarsProps {
  /** How many of the three stars are lit. */
  readonly lit: number;
  readonly size?: 'small' | 'large';
}

export function Stars({ lit, size = 'small' }: StarsProps) {
  return (
    <span className={`stars stars--${size}`} role="img" aria-label={`${lit} of 3 stars`}>
      {[1, 2, 3].map((star) => (
        <span key={star} className={star <= lit ? 'star star--lit' : 'star'}>
          ★
        </span>
      ))}
    </span>
  );
}
