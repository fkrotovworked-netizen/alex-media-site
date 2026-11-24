import { asset } from '../asset';
import { content } from '../content';

/** The words beside a form's checkbox (152-ФЗ): the consent and the policy, each its own page. */
export const ConsentText = () => {
  const [give, consent, and, policy] = content.final.consent;
  return (
    <span>
      {give}{' '}
      <a href={asset(content.final.consentPage)} target="_blank" rel="noreferrer">
        {consent}
      </a>{' '}
      {and}{' '}
      <a href={asset(content.final.policy)} target="_blank" rel="noreferrer">
        {policy}
      </a>
    </span>
  );
};
