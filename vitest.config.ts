import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/__tests__/**/*.test.ts"],
		exclude: ["node_modules", "dist", "out"],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@api": path.resolve(__dirname, "./src/core/api"),
			"@core": path.resolve(__dirname, "./src/core"),
			"@generated": path.resolve(__dirname, "./src/generated"),
			"@hosts": path.resolve(__dirname, "./src/hosts"),
			"@integrations": path.resolve(__dirname, "./src/integrations"),
			"@packages": path.resolve(__dirname, "./src/packages"),
			"@services": path.resolve(__dirname, "./src/services"),
			"@shared": path.resolve(__dirname, "./src/shared"),
			"@utils": path.resolve(__dirname, "./src/utils"),
		},
	},
})
