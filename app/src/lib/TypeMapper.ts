import type { XmlSchemaType } from '@/services/ProjectService';

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
