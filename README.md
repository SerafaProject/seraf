# Seraf

Seraf is a powerful tool to streamline your project setup and module management. Below are the steps to install and use it effectively.

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```bash
   cd seraf
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build Seraf:
   ```bash
   npm run build
   ```
5. Install Seraf globally:
   ```bash
   npm install -g .
   ```

## Usage

### Initialize a Project
To initialize a new project, run:
```bash
seraf init
```

### Manage Modules
Seraf simplifies module creation and management with the following commands:

#### Create a Module
1. Run the module command:
   ```bash
   seraf module
   ```
2. Select the **"create"** option.
3. Enter a name for your module when prompted.

#### Build a Module
1. Update the `IModel` file with the fields required for your module.
2. Run the module command:
   ```bash
   seraf module
   ```
3. Select the **"build"** option.
4. Enter the name of the module you want to build.

### Run the Application
1. Import the `moduleExpressRoutes` in the `expressSetup.ts` file:
   ```typescript
   import { moduleExpressRoutes } from '<module-path>';
   ```
2. Set up the routes in your Express application.
3. Start the API server as usual.

## Support
For more detailed documentation or support, refer to the project's official documentation or contact the maintainers.