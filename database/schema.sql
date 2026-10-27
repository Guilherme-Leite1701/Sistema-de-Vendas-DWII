-- =====================================================================
-- Sistema de Vendas com Comissões, Metas e Performance
-- Script de criação do banco de dados (MySQL 8.0+)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS db_vendas
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE db_vendas;

-- ---------------------------------------------------------------------
-- Tabela: vendedores
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendedores (
  id_vendedor      INT            NOT NULL AUTO_INCREMENT,
  nome             VARCHAR(100)   NOT NULL,
  meta_mensal      DECIMAL(12,2)  NOT NULL,
  percentual_base  DECIMAL(5,2)   NOT NULL,
  ativo            BOOLEAN        NOT NULL DEFAULT TRUE,   -- 1 = ativo, 0 = inativo
  PRIMARY KEY (id_vendedor)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabela: regioes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS regioes (
  id_regiao         INT           NOT NULL AUTO_INCREMENT,
  nome_regiao       VARCHAR(50)   NOT NULL,
  percentual_bonus  DECIMAL(5,2)  NOT NULL,
  PRIMARY KEY (id_regiao),
  UNIQUE KEY uq_regioes_nome (nome_regiao)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabela: vendas
-- id_venda é a chave primária (código único da venda). Ele pode ser
-- informado na requisição; se não for, o AUTO_INCREMENT gera o código.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendas (
  id_venda        INT                NOT NULL AUTO_INCREMENT,
  id_vendedor     INT                NOT NULL,
  id_regiao       INT                NOT NULL,
  data_venda      DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valor_venda     DECIMAL(12,2)      NOT NULL,
  tipo_cliente    ENUM('PF','PJ')    NOT NULL,
  valor_comissao  DECIMAL(12,2)      NOT NULL,
  PRIMARY KEY (id_venda),
  CONSTRAINT fk_vendas_vendedor FOREIGN KEY (id_vendedor)
    REFERENCES vendedores (id_vendedor)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_vendas_regiao FOREIGN KEY (id_regiao)
    REFERENCES regioes (id_regiao)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_vendas_valor_positivo CHECK (valor_venda > 0),
  INDEX idx_vendas_data (data_venda)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Carga obrigatória: regiões e seus bônus (regra 4.3)
-- ---------------------------------------------------------------------
INSERT INTO regioes (id_regiao, nome_regiao, percentual_bonus) VALUES
  (1, 'Norte',    1.00),
  (2, 'Nordeste', 1.00),
  (3, 'Sudeste',  0.00),
  (4, 'Sul',      0.50)
ON DUPLICATE KEY UPDATE
  nome_regiao      = VALUES(nome_regiao),
  percentual_bonus = VALUES(percentual_bonus);
