import type { JsonColumnType, XmlSchemaType } from '@/services/ProjectService';

/**
 * Maps a SQL/JDBC column type string to the closest XSD type.
 * The input is normalized to uppercase before matching.
 */
export function mapSqlTypeToXsd(sqlType: string): XmlSchemaType {
    const t = (sqlType ?? '').toUpperCase();

    if (/BOOL/.test(t) || t === 'BIT') return 'xs:boolean';

    if (/TIMESTAMP|DATETIME/.test(t)) return 'xs:dateTime';

    if (/^DATE$/.test(t)) return 'xs:date';

    if (/BIGINT|BIGSERIAL/.test(t)) return 'xs:long';

    if (/^(INT|INTEGER|SMALLINT|TINYINT|MEDIUMINT|SERIAL|INT2|INT4|INT8)$/.test(t)) {
        return 'xs:integer';
    }
    if(/^(REAL|FLOAT|DOUBLE|DOUBLE PRECISION|DECIMAL|NUMERIC|MONEY)$/.test(t)) {
        return 'xs:decimal';
    }
    if(/^(TEXT|CLOB|JSON|XML|BINARY)$/.test(t)) {
        return 'xs:hexBinary';
    }
    return 'xs:string';
}

/**
 * Maps a SQL/JDBC column type string to the closest JSON scalar type.
 * The input is normalized to uppercase before matching.
 */
export function mapSqlTypeToJson(sqlType: string): JsonColumnType {
    const t = (sqlType ?? '').toUpperCase();

    if (/BOOL/.test(t) || t === 'BIT') return 'boolean';

    if (/BIGINT|BIGSERIAL|^(INT|INTEGER|SMALLINT|TINYINT|MEDIUMINT|SERIAL|INT2|INT4|INT8)$/.test(t)) {
        return 'number';
    }
    if (/^(REAL|FLOAT|DOUBLE|DOUBLE PRECISION|DECIMAL|NUMERIC|MONEY)$/.test(t)) {
        return 'number';
    }

    return 'string';
}
