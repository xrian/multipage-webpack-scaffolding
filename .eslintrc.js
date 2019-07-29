module.exports = {
	'env': {
		'browser': true,
		'es6': true,
		'jquery': true,
	},
	'extends': 'eslint:recommended',
	'parserOptions': {
		'ecmaVersion': 2016,
		'sourceType': 'module',
	},
	'rules': {
		'no-use-before-define': ['error', { 'functions': false }], // 禁止变量使用前调用
		'indent': [
			'error',
			2,
		],
		'linebreak-style': [
			'error',
			'unix',
		],
		'quotes': [
			'error',
			'single',
		],
		'semi': [
			'error',
			'always',
		],
	},
};
