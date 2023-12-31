/*
 * Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Das Modul besteht aus der Controller-Klasse für Schreiben an der REST-Schnittstelle.
 * @packageDocumentation
 */

import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiHeader,
    ApiNoContentResponse,
    ApiOperation,
    ApiPreconditionFailedResponse,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import {
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { CdDTO, CdDtoOhneRef } from './cdDTO.entity.js';
import { Request, Response } from 'express';
import { type Cd } from '../entity/cd.entity.js';
import { CdWriteService } from '../service/cd-write.service.js';
import { JwtAuthGuard } from '../../security/auth/jwt/jwt-auth.guard.js';
import { type Lied } from '../entity/lied.entity.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { RolesAllowed } from '../../security/auth/roles/roles-allowed.decorator.js';
import { RolesGuard } from '../../security/auth/roles/roles.guard.js';
import { type Titel } from '../entity/titel.entity.js';
import { getBaseUri } from './getBaseUri.js';
import { getLogger } from '../../logger/logger.js';
import { paths } from '../../config/paths.js';

const MSG_FORBIDDEN = 'Kein Token mit ausreichender Berechtigung vorhanden';
/**
 * Die Controller-Klasse für die Verwaltung von CDs.
 */
@Controller(paths.rest)
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Cd REST-API')
@ApiBearerAuth()
export class CdWriteController {
    readonly #service: CdWriteService;

    readonly #logger = getLogger(CdWriteController.name);

    constructor(service: CdWriteService) {
        this.#service = service;
    }

    /**
     * Eine neue Cd wird asynchron angelegt. Die neu anzulegende Cd ist als
     * JSON-Datensatz im Request-Objekt enthalten. Wenn es keine
     * Verletzungen von Constraints gibt, wird der Statuscode `201` (`Created`)
     * gesetzt und im Response-Header wird `Location` auf die URI so gesetzt,
     * dass damit das neu angelegte Cd abgerufen werden kann.
     *
     * Falls Constraints verletzt sind, wird der Statuscode `400` (`Bad Request`)
     * gesetzt und genauso auch wenn der Titel oder die ISRC-Nummer bereits
     * existieren.
     *
     * @param cd JSON-Daten für ein Cd im Request-Body.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Post()
    @RolesAllowed('admin', 'fachabteilung')
    @ApiOperation({ summary: 'Eine neue Cd anlegen' })
    @ApiCreatedResponse({ description: 'Erfolgreich neu angelegt' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Cddaten' })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async post(
        @Body() cdDTO: CdDTO,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug('post: cdDTO=%o', cdDTO);

        const cd = this.#cdDtoToCd(cdDTO);
        const result = await this.#service.create(cd);

        const location = `${getBaseUri(req)}/${result}`;
        this.#logger.debug('post: location=%s', location);
        return res.location(location).send();
    }

    /**
     * Eine vorhandene Cd wird asynchron aktualisiert.
     *
     * Im Request-Objekt von Express muss die ID des zu aktualisierenden Cds
     * als Pfad-Parameter enthalten sein. Außerdem muss im Rumpf das zu
     * aktualisierenden Cd als JSON-Datensatz enthalten sein. Damit die
     * Aktualisierung überhaupt durchgeführt werden kann, muss im Header
     * `If-Match` auf die korrekte Version für optimistische Synchronisation
     * gesetzt sein.
     *
     * Bei erfolgreicher Aktualisierung wird der Statuscode `204` (`No Content`)
     * gesetzt und im Header auch `ETag` mit der neuen Version mitgeliefert.
     *
     * Falls die Versionsnummer fehlt, wird der Statuscode `428` (`Precondition
     * required`) gesetzt; und falls sie nicht korrekt ist, der Statuscode `412`
     * (`Precondition failed`). Falls Constraints verletzt sind, wird der
     * Statuscode `400` (`Bad Request`) gesetzt und genauso auch wenn der neue
     * Titel oder die neue ISRC-Nummer bereits existieren.
     *
     * @param cd Cddaten im Body des Request-Objekts.
     * @param id Pfad-Paramater für die ID.
     * @param version Versionsnummer aus dem Header _If-Match_.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    // eslint-disable-next-line max-params
    @Put(':id')
    @RolesAllowed('admin', 'fachabteilung')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Eine vorhandene Cd aktualisieren',
        tags: ['Aktualisieren'],
    })
    @ApiHeader({
        name: 'If-Match',
        description: 'Header für optimistische Synchronisation',
        required: false,
    })
    @ApiNoContentResponse({ description: 'Erfolgreich aktualisiert' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Cddaten' })
    @ApiPreconditionFailedResponse({
        description: 'Falsche Version im Header "If-Match"',
    })
    @ApiResponse({
        status: HttpStatus.PRECONDITION_REQUIRED,
        description: 'Header "If-Match" fehlt',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async put(
        @Body() cdDTO: CdDtoOhneRef,
        @Param('id') id: number,
        @Headers('If-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug(
            'put: id=%s, cdDTO=%o, version=%s',
            id,
            cdDTO,
            version,
        );

        if (version === undefined) {
            const msg = 'Header "If-Match" fehlt';
            this.#logger.debug('put: msg=%s', msg);
            return res
                .status(HttpStatus.PRECONDITION_REQUIRED)
                .set('Content-Type', 'application/json')
                .send(msg);
        }

        const cd = this.#cdDtoOhneRefToCd(cdDTO);
        const neueVersion = await this.#service.update({ id, cd, version });
        this.#logger.debug('put: version=%d', neueVersion);
        return res.header('ETag', `"${neueVersion}"`).send();
    }

    #cdDtoToCd(cdDTO: CdDTO): Cd {
        const titelDTO = cdDTO.titel;
        const titel: Titel = {
            id: undefined,
            titel: titelDTO.titel,
            untertitel: titelDTO.untertitel,
            cd: undefined,
        };
        const lieder = cdDTO.lieder?.map((liedDTO) => {
            const lied: Lied = {
                id: undefined,
                liedTitel: liedDTO.liedTitel,
                laenge: liedDTO.laenge,
                cd: undefined,
            };
            return lied;
        });
        const cd = {
            id: undefined,
            version: undefined,
            isrc: cdDTO.isrc,
            bewertung: cdDTO.bewertung,
            genre: cdDTO.genre,
            preis: cdDTO.preis,
            skonto: cdDTO.skonto,
            verfuegbar: cdDTO.verfuegbar,
            erscheinungsdatum: cdDTO.erscheinungsdatum,
            interpret: cdDTO.interpret,
            titel,
            lieder,
            erzeugt: undefined,
            aktualisiert: undefined,
        };

        // Rueckwaertsverweise
        cd.titel.cd = cd;
        cd.lieder?.forEach((lied) => {
            lied.cd = cd;
        });
        return cd;
    }

    #cdDtoOhneRefToCd(cdDTO: CdDtoOhneRef): Cd {
        return {
            id: undefined,
            version: undefined,
            isrc: cdDTO.isrc,
            bewertung: cdDTO.bewertung,
            genre: cdDTO.genre,
            preis: cdDTO.preis,
            skonto: cdDTO.skonto,
            verfuegbar: cdDTO.verfuegbar,
            erscheinungsdatum: cdDTO.erscheinungsdatum,
            interpret: cdDTO.interpret,
            titel: undefined,
            lieder: undefined,
            erzeugt: undefined,
            aktualisiert: undefined,
        };
    }
}
