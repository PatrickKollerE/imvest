import { getTranslations } from 'next-intl/server';
import LoginForm from './LoginForm';

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const t = await getTranslations({ locale });

	const translations = {
		signIn: t('auth.signIn'),
		email: t('auth.email'),
		password: t('auth.password'),
		loading: t('common.loading'),
		loginError: t('auth.loginError'),
		dontHaveAccount: t('auth.dontHaveAccount'),
		signUp: t('auth.signUp'),
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<LoginForm locale={locale} translations={translations} />
		</div>
	);
}
