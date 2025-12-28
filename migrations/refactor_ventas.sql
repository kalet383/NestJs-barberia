-- ============================================
-- MIGRACIÓN: Refactorización del Sistema de Ventas
-- Fecha: 2025-12-26
-- Descripción: Separar venta de detalles de venta
-- ============================================

-- Paso 1: Crear tabla detalle_venta
CREATE TABLE IF NOT EXISTS `detalle_venta` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_venta` INT NOT NULL,
  `id_producto` INT NOT NULL,
  `cantidad` INT NOT NULL,
  `precioUnitario` DECIMAL(10, 2) NOT NULL,
  `subtotal` DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_detalle_venta_venta_idx` (`id_venta` ASC),
  INDEX `fk_detalle_venta_producto_idx` (`id_producto` ASC),
  CONSTRAINT `fk_detalle_venta_venta`
    FOREIGN KEY (`id_venta`)
    REFERENCES `venta` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_detalle_venta_producto`
    FOREIGN KEY (`id_producto`)
    REFERENCES `producto` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Paso 2: Migrar datos existentes de venta a detalle_venta
-- (Solo si hay datos existentes que preservar)
INSERT INTO `detalle_venta` (`id_venta`, `id_producto`, `cantidad`, `precioUnitario`, `subtotal`)
SELECT 
  v.`id` AS `id_venta`,
  v.`Id_Producto` AS `id_producto`,
  v.`cantidad`,
  v.`precioUnitario`,
  (v.`cantidad` * v.`precioUnitario`) AS `subtotal`
FROM `venta` v
WHERE v.`Id_Producto` IS NOT NULL;

-- Paso 3: Agregar columna estado a venta si no existe
ALTER TABLE `venta` 
ADD COLUMN IF NOT EXISTS `estado` ENUM('PENDIENTE', 'PAGADA', 'CANCELADA') NOT NULL DEFAULT 'PAGADA' 
AFTER `tipoPago`;

-- Paso 4: Eliminar columnas obsoletas de venta
-- IMPORTANTE: Hacer backup antes de ejecutar estos comandos
ALTER TABLE `venta` 
DROP FOREIGN KEY IF EXISTS `fk_venta_producto`,
DROP COLUMN IF EXISTS `Id_Producto`,
DROP COLUMN IF EXISTS `cantidad`,
DROP COLUMN IF EXISTS `precioUnitario`;

-- Paso 5: Verificar que los datos se migraron correctamente
-- SELECT COUNT(*) FROM detalle_venta;
-- SELECT * FROM venta LIMIT 10;
-- SELECT * FROM detalle_venta LIMIT 10;

-- ============================================
-- NOTAS IMPORTANTES:
-- 1. Hacer backup de la base de datos antes de ejecutar
-- 2. Verificar que no haya datos críticos antes de eliminar columnas
-- 3. Si TypeORM tiene synchronize: true, puede hacer estos cambios automáticamente
-- 4. Ajustar nombres de columnas según la convención de tu base de datos
-- ============================================

