# Conectar projeto ao GitHub (GRDados)

## 1) Inicializar repositório local

```bash
git init
git branch -M main
```

## 2) Primeiro commit

```bash
git add .
git commit -m "chore: bootstrap monorepo GRDados"
```

## 3) Conectar remoto

```bash
git remote add origin https://github.com/grdados/saas-drdados.git
```

Se já existir `origin`:

```bash
git remote set-url origin https://github.com/grdados/saas-drdados.git
```

## 4) Subir para o GitHub

```bash
git push -u origin main
```
