# PagBus Mobile

Aplicativo mobile desenvolvido com React Native e Expo para sistema de pagamento de passagens de ônibus.

## 📋 Funcionalidades

- ✅ Seleção de tarifas (R$ 4,20 ou R$ 5,00)
- ✅ Geração de QR Code PIX
- ✅ Link de pagamento copiável
- ✅ Interface moderna e intuitiva
- ✅ Integração com API via Axios
- ✅ Configuração centralizada de requisições

## 🚀 Como Executar

### Pré-requisitos

- Node.js instalado
- Expo CLI: `npm install -g expo-cli`
- Android Studio (para emulador Android) ou Xcode (para iOS)

### Instalação

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure as variáveis de ambiente (opcional):
```bash
cp .env.example .env
# Edite o .env com suas configurações
```

### Executando o Projeto

   ```bash
   npx expo start
   ```

Escaneie o QR code com:
- **Expo Go** (app instalado no celular)
- **Emulador Android** (pressione `a`)
- **Simulador iOS** (pressione `i`)

### Desenvolvimento

O código principal está em:
- `src/app/(tabs)/index.tsx` - Tela principal de pagamento
- `src/app/payment-detail.tsx` - Tela de detalhes do pagamento
- `src/services/api.ts` - Configuração do Axios
- `src/services/paymentService.ts` - Serviço de pagamento

## 📁 Estrutura do Projeto

```
mobile/
├── src/
│   ├── app/
│   │   ├── _layout.tsx              # Layout raiz
│   │   ├── payment-detail.tsx        # Tela de pagamento
│   │   └── (tabs)/
│   │       ├── _layout.tsx           # Layout das tabs
│   │       ├── index.tsx              # Tela de seleção
│   │       └── explore.tsx            # Outras telas
│   ├── services/
│   │   ├── api.ts                    # Config Axios ⭐
│   │   ├── paymentService.ts         # Serviço de pagamento
│   │   └── index.ts                  # Exports centralizados
│   └── config/
│       └── env.ts                    # Configurações de ambiente
├── assets/                            # Imagens e recursos
├── app.json                           # Configuração do Expo
└── package.json                       # Dependências
```

## 🔧 Configuração da API

### Via Arquivo .env (Recomendado)

Crie um arquivo `.env` na raiz do projeto:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

Para produção:
```env
EXPO_PUBLIC_API_URL=https://api.pagbus.com.br
```

### Via Código

Edite `src/config/env.ts`:

```typescript
export const API_URL = 'https://sua-api.com.br';
```

## 🌐 Configuração do Axios

O projeto usa **Axios** com configuração centralizada em `src/services/api.ts`.

### Funcionalidades:

- ✅ Timeout automático (30 segundos)
- ✅ Interceptors para adicionar token de autenticação
- ✅ Tratamento global de erros
- ✅ Refresh token automático (401)
- ✅ Logging de requisições em desenvolvimento

### Uso:

```typescript
import { apiService, paymentService } from '@/services';

// GET
const data = await apiService.get('/api/endpoint');

// POST
const response = await apiService.post('/api/endpoint', { data });

// Usando serviço específico
const payment = await paymentService.createPayment(paymentData);
```

## 🧪 Testando o Pagamento

### Modo de Teste (Mock)

Atualmente, o app usa dados mock por padrão:

1. Selecione uma tarifa (R$ 4,20 ou R$ 5,00)
2. Aguarde a geração do QR Code
3. Escaneie o QR Code com seu app bancário
4. Ou copie o link PIX clicando no botão

### Integrando com a API Real

O código já está preparado para usar a API real:

```typescript
const paymentData: PaymentRequest = {
  company_id: 1,
  items: [
    {
      title: `Passagem - ${tariff.name}`,
      quantity: 1,
      unit_price: tariff.value,
      currency_id: 'BRL',
    },
  ],
  external_reference: `ref_${Date.now()}`,
  front_url: 'pagbusmobile://',
};

const response = await paymentService.createPayment(paymentData);
```

Se a API falhar, o app automaticamente usa dados mock e exibe um alerta.

## 🔐 Autenticação

O Axios está configurado para buscar tokens automaticamente:

```typescript
// Salvar token
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('auth_token', token);

// O Axios usa automaticamente nas próximas requisições
```

## 📦 Dependências Principais

- `react-native`: Framework mobile
- `expo`: Plataforma de desenvolvimento
- `expo-router`: Navegação baseada em arquivos
- `axios`: Cliente HTTP com interceptors
- `react-native-qrcode-svg`: Geração de QR codes
- `@react-native-clipboard/clipboard`: Clipboard nativo
- `expo-secure-store`: Armazenamento seguro de tokens

## 🎨 Design

A interface segue uma paleta moderna com:
- Cores principais: Azul (#007AFF) e Branco
- Layout responsivo e acessível
- Feedback visual adequado
- Animações suaves entre telas

## 🐛 Debug

Para ver logs de requisições em desenvolvimento:

```typescript
// Já configurado automaticamente
console.log('Requisição:', data);
```

## 📄 Licença

Este projeto é privado.
