-- Migration: agregar columna cantidad_publicada a la tabla producto
ALTER TABLE `producto` ADD COLUMN `cantidad_publicada` INT NOT NULL DEFAULT 0;